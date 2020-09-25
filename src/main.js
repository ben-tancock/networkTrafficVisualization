import {
	BoxBufferGeometry,
	Mesh,
	MeshBasicMaterial,
    PerspectiveCamera,
    OrthographicCamera,
	Scene,
	WebGLRenderer
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { ENETUNREACH } from 'constants';

let camera, scene, renderer, intersectionArr, nodes
var raycaster = new THREE.Raycaster(); // create once
var mouse = new THREE.Vector2(); // create once

class App {
	init(data, width, height) {
        raycaster.params.Points.threshold = 0.2;
        intersectionArr = []; // an array that holds all the scene objects we want to have click events for
       
		camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
		camera.position.z = 9;
        scene = new Scene();
        
        nodes = []; // holds all the point objects in the scene
        nodes = buildNodeObjects(nodes, data);
        var sorted = sortPrivate(nodes); // sort which ip addresses belong to the network and which don't

        console.log(sorted);
        console.log("the nodes: %j",  nodes); // returns 15 unique ip addresses

        // arrays that will hold the public and private node objects
        var privArr = [];
        var pubArr = [];
        for(var n in nodes){
            if(nodes[n].is_private){
                privArr.push(nodes[n]);
            }
            else{
                pubArr.push(nodes[n]);
            }
        } 

        // algorithm for rendering private nodes in a pattern (should be a N, E, S, W type sorta thing)
        for(var n = 0; n < privArr.length; n++){
            var rad = Math.floor(n/4);
            if(n%4 < 2){
                var x = (n%2) * ((1 + rad) * Math.pow(-1, (n%2)));
                var y = ((n+1)%2) * ((1 + rad) * Math.pow(-1, (n%2)));
            }else{
                var y = (n%2) * ((1 + rad) * Math.pow(-1, (n%2)));
                var x = ((n+1)%2) * ((1 + rad) * Math.pow(-1, (n%2)));
            }
            var z = 0;
            var color = 0x00b3ff;
            privArr[n].coords.x = x;
            privArr[n].coords.y = y;
            var point = makePoint(x, y, z, color);
            point.name = privArr[n].ip;
            intersectionArr.push(point);
            scene.add(point);
        }

         // this creates a circle where the vertices = the number of public ip addresses in the packet data, use the geometry for easy node placement
         var pubCircleGeometry = new THREE.RingGeometry( 4.5, 4.51, pubArr.length ); // inner radius, outer radius, theta segments

        for(var n = 0; n < pubArr.length; n++){
            var x = pubCircleGeometry.vertices[n].x;
            var y = pubCircleGeometry.vertices[n].y;
            var z = 0;
            var color = 0xFF0000;
            pubArr[n].coords.x = x;
            pubArr[n].coords.y = y;
            var point = makePoint(x, y, z, color);
            point.name = pubArr[n].ip;
            intersectionArr.push(point);
            scene.add(point);
        }

        drawLabels(privArr); // renders the ip addresses above the ip nodes
        drawLabels(pubArr);
   
        var joined = privArr.concat(pubArr);
        // loops through all the packet data and draws the appropriate links
        for(var i = 0; i < data.length; i++){
            var srcNode = joined.find(node => node.ip == data[i].Source);
            var destNode = joined.find(node => node.ip == data[i].Destination);
            var protocol = data[i].Protocol;
            var x1 = srcNode.coords.x;
            var y1 = srcNode.coords.y;
            var x2 = destNode.coords.x;
            var y2 = destNode.coords.y;
         
            var rand1 = (Math.random())/10 - 0.05;
            var rand2 = (Math.random())/10 - 0.05;
           
            var link = drawLink(x1, y1, x2+rand1, y2+rand2, protocol);
            link.name = protocol;
            scene.add(link);
        }

		renderer = new WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( renderer.domElement );
		window.addEventListener( 'resize', onWindowResize, false );
        const controls = new OrbitControls( camera, renderer.domElement );
        controls.enableRotate = false;

        // initialize object to perform world/screen calculations
        //projector = new THREE.Projector();
        
        
        document.addEventListener( 'click', onMouseClick, false );
        document.addEventListener( 'mousemove', onMouseMove, false );

        document.getElementById('DNS').addEventListener('click', onFilterClick, false);
        document.getElementById('TCP').addEventListener('click', onFilterClick, false);
        document.getElementById('UDP').addEventListener('click', onFilterClick, false);
        document.getElementById('CMPP').addEventListener('click', onFilterClick, false);

      
        //document.addEventListener( 'mousedown', onDocumentMouseDown, false );
        
		animate();
	}
}

// -------------- CUSTOM METHODS --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function drawLabels(arr){
    for (var i = 0; i < arr.length; i++){
        var spriteIP = arr[i].ip;
        var spritey = makeTextSprite( spriteIP, { fontsize: 40, backgroundColor: {r:255, g:255, b:255, a:0}, textColor: {r:255, g:255, b:255, a:1} } );
        spritey.position.x = arr[i].coords.x;
        spritey.position.y = arr[i].coords.y;
        spritey.position.z = 0;
        scene.add( spritey );
    }
}

function onMouseClick ( event ){
    // update the picking ray with the camera and mouse position
	raycaster.setFromCamera( mouse, camera );

	// calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects( intersectionArr );
    
    // create the appropriate graphs when the user clicks a node
    if(intersects.length == 1){
        for ( var i = 0; i < intersects.length; i++ ) {
            console.log(intersects[i].object.name);
            loadChart(intersects[i].object.name, 'piechart');
            loadChart(intersects[i].object.name, 'barchart');
        }
    }   
}

function loadChart(ip, chartType){
    google.charts.load('current', {'packages':['corechart']});
    if(chartType == 'piechart'){
        google.charts.setOnLoadCallback(function(){drawPie(ip, chartType)});
    } else{
        google.charts.setOnLoadCallback(function(){drawBar(ip, 'Incoming')});
        google.charts.setOnLoadCallback(function(){drawBar(ip, 'Outgoing')});
    }
}



function drawPie(ip){
    console.log("chart ip: %s", ip);
    // need actual data here, use ip address to find in array
    // nodes has what we need, ingoing, outgoing, etc., no need for coords
    // traffic is all the packet json objects
    // dns, tcp, udp, cmpp
    var nodeData = nodes.find(node => node.ip == ip);
    var num_dns=0;
    var num_tcp=0;
    var num_udp=0;
    var num_cmpp=0;

    for(var n in nodeData.incoming){
        if(nodeData.incoming[n].protocol == "DNS"){
            num_dns++;
        }else if(nodeData.incoming[n].protocol == "TCP"){ 
            num_tcp++;
        }else if(nodeData.incoming[n].protocol == "UDP"){ 
            num_udp++;
        }else{ 
            num_cmpp++;
        }
    }
    for(var n in nodeData.outgoing){
        if(nodeData.outgoing[n].protocol == "DNS"){
            num_dns++;
        }else if(nodeData.outgoing[n].protocol == "TCP"){ 
            num_tcp++;
        }else if(nodeData.outgoing[n].protocol == "UDP"){ 
            num_udp++;
        }else{ 
            num_cmpp++;
        }
    }
    var graphData = google.visualization.arrayToDataTable([
        ['Task', 'Hours per Day'],
        ['DNS', num_dns],
        ['TCP', num_tcp],
        ['UDP', num_udp],
        ['CMPP', num_cmpp]
    ]);
  
    // Optional; add a title and set the width and height of the chart
    var options = {
        'title':' Total Packet traffic by Request # for ' + ip, 
        'width':'25%', 
        'height':'30%', 
        'backgroundColor': 'transparent', 
        'legend':{'textStyle': {'color': 'white'}}, 
        'titleTextStyle': {'color': 'white'},
        'slices': [
            {'color': '#00FF80', 'textStyle': {'color': 'black'} },
            {'color': '#8080FF', 'textStyle': {'color': 'black'} },
            {'color': '#FFFF66', 'textStyle': {'color': 'black'} },
            {'color': '#FF0000', 'textStyle': {'color': 'black'} }
        ]
    };
  
    // Display the chart inside the <div> element with id="piechart"
    var chart = new google.visualization.PieChart(document.getElementById('piechart'));
    chart.draw(graphData, options);
}

function drawBar(ip, barType){
    var nodeData = nodes.find(node => node.ip == ip);
    var dirIPs = [];
    var nodeDirection;
    var chart_id;

    if(barType == 'Incoming'){
        nodeDirection = nodeData.incoming;
        chart_id = 'barchart1';
    }
    else{
        nodeDirection = nodeData.outgoing;
        chart_id = 'barchart2';
    }

    if(nodeDirection.length == 0){ // if you're making an incoming/outgoing traffic graph and there is no incoming/outgoing traffic, stop
        console.log('test return');
        document.getElementById(chart_id).style.setProperty('visibility','hidden');
        return; 
    } else{
        document.getElementById(chart_id).style.setProperty('visibility','visible');
    }
    
    console.log(nodeData);

    for (var e in nodeDirection){
        dirIPs.push(nodeDirection[e].ip);
    }
    dirIPs = Array.from(new Set(dirIPs)); // array of all unique IP addresses

    for(var i in dirIPs){
        dirIPs[i] = {ip:dirIPs[i], num_dns: 0, num_tcp:0, num_udp:0, num_cmpp:0};
    }

    for(var n in nodeDirection){
        var curr_ip = dirIPs.find(inc_ip => inc_ip.ip == nodeDirection[n].ip);
        if(nodeDirection[n].protocol == "DNS"){
            curr_ip.num_dns++;
        }else if(nodeDirection[n].protocol == "TCP"){ 
            curr_ip.num_tcp++;
        }else if(nodeDirection[n].protocol == "UDP"){ 
            curr_ip.num_udp++;
        }else{ 
            curr_ip.num_cmpp++;
        }
    }

    var dataArr = [ 
        ['IP Address', 'DNS', 'TCP', 'UDP', 'CMPP', {role: 'annotation'}],
    ];

    for(var i in dirIPs){
        dataArr.push([dirIPs[i].ip, dirIPs[i].num_dns, dirIPs[i].num_tcp,  dirIPs[i].num_udp,  dirIPs[i].num_cmpp, ''] );
    }

    var graphData = google.visualization.arrayToDataTable(dataArr);
    var options = {
        'title': barType + ' Packets for ' + ip, 
        'width':'25%', 
        'height':'30%', 
        'backgroundColor': 'transparent', 
        'legend':{'textStyle': {'color': 'white'}}, 
        'titleTextStyle': {'color': 'white'},
        'isStacked':'percent',
        'bars': 'horizontal',
        'series': {
            0:{axis: 'DNS', 'color':'00FF80', 'textStyle': {'color': 'white'}},
            1:{axis: 'TCP', 'color':'8080FF', 'textStyle': {'color': 'white'}},
            2:{axis: 'UDP', 'color':'#FFFF66', 'textStyle': {'color': 'white'}},
            3:{axis: 'CMPP', 'color':'#FF0000', 'textStyle': {'color': 'white'}}
        },
        'hAxis' : { textStyle: {color: 'white'}},
        'vAxis' : { textStyle: {color: 'white'}},
        
    };
  
    // Display the chart inside the <div> element with id="barChar1" or "barChart2" depending on the chart value
    var chart = new google.visualization.BarChart(document.getElementById(chart_id));
    chart.draw(graphData, options);
}

function onMouseMove( event ) {
	// calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    camera.updateProjectionMatrix();
    raycaster.setFromCamera(mouse, camera);
}

function onFilterClick( event ){
    var btnName = event.srcElement.id;
    var btn = document.getElementById(btnName);
    var color = window.getComputedStyle(btn).color;
    if(color == 'rgb(50, 205, 50)'){ // set the filter btn to a greyed out state
        btn.style.setProperty('border', 'solid 2px gray');
        btn.style.setProperty('color', 'grey');
    }
    else{
        btn.style.setProperty('border', 'solid 2px lightgray');
        btn.style.setProperty('color', 'limegreen');
    }
    

    // if these filter buttons are clicked, we want to toggle the visibility of links
    scene.traverse(function(child){
        if(child.name == btnName){
            child.visible = !child.visible;
        }
    });
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function buildNodeObjects(nodes, data){
    var ipArr = [];
    for (var e in data){
        ipArr.push(data[e].Source);
        ipArr.push(data[e].Destination);
    }
    ipArr = Array.from(new Set(ipArr)); // array of all unique IP addresses

    for(var e in ipArr){
        ipArr[e] = {ip:ipArr[e], outgoing: [], incoming: [], coords: {x:0, y:0}, is_private: false};
    }

    // now we need to add in the outgoing and incoming to all the ipArr node objects
    for(var e in data){
        // data[e] = packet JSON w/ Source, Destination, Time, Protocol, Length, and Number
        var packet = data[e];
        var sending = ipArr.find(node => node.ip == packet.Source);
        var recieving = ipArr.find(node => node.ip == packet.Destination);
        if(recieving == undefined){
            console.log("recieving is undefined, here is the ip address with no matching Destination: %s", packet.Destination );
        } else{
            recieving.incoming.push({ip:packet.Source, protocol: packet.Protocol});
        }

        if(sending == undefined){
            console.log("sending is undefined, here is the ip address with no matching Source: %s", packet.Source );
        } else{
            sending.outgoing.push({ip:packet.Destination, protocol: packet.Protocol});
        }
    }
    return ipArr;
}

// sorts which packets have public vs private ip addresses
function sortPrivate(nodes){
    var sorted = {privateIPs: [], publicIPs: []};
    for(var n in nodes){
        var ip = nodes[n].ip;
        ip = ip.split('.');
        if(isPrivate(ip)){
            nodes[n].is_private = true;
            sorted.privateIPs.push(nodes[n].ip);
        }
        else{
            sorted.publicIPs.push(nodes[n].ip);
        }
    }
    return sorted;
}

function isPrivate(ip){
    // private ip address ranges, anything outside of these are public:
    // 10.0.0.0 - 10.255.255.255
    // 172.16.0.0 - 172.31.255.255
    // 192.168.0.0 - 192.168.255.255
    if(ip[0] == 10 && ip[1] >= 0 && ip[1] <= 255 && ip[2] >= 0 && ip[2] <= 255 && ip[3] >= 0 && ip[3] <= 255){
        return true;
    }
    else if(ip[0] == 172 && ip[1] >= 0 && ip[1] <= 255 && ip[2] >= 0 && ip[2] <= 255 && ip[3] >= 0 && ip[3] <= 255){
        return true;
    }
    else if(ip[0] == 192 && ip[1] == 168 && ip[2] >= 0 && ip[2] <= 255 && ip[3] >= 0 && ip[3] <= 255){
        return true;
    }
    return false;
}

function makeTextSprite( message, parameters )
{
	if ( parameters === undefined ) parameters = {};
	var fontface = parameters.hasOwnProperty("fontface") ? 
		parameters["fontface"] : "Arial";
	
	var fontsize = parameters.hasOwnProperty("fontsize") ? 
		parameters["fontsize"] : 40;
	
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
		parameters["borderThickness"] : 4;
	
	var borderColor = parameters.hasOwnProperty("borderColor") ?
		parameters["borderColor"] : { r:1, g:1, b:0, a:0.1 };
	
	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
        parameters["backgroundColor"] : { r:1, g:1, b:1, a:1.0 };
        
    var textColor = parameters.hasOwnProperty("textColor") ?
        parameters["textColor"] : { r:1, g:1, b:1, a:1.0 };
		
    var canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
    	
	// background color
	context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
								  + backgroundColor.b + "," + backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
								  + borderColor.b + "," + borderColor.a + ")";

	context.lineWidth = borderThickness;
    context.fillStyle   = "rgba(" + textColor.r + "," + textColor.g + ","
								  + textColor.b + "," + textColor.a + ")";

	context.fillText( message, borderThickness, fontsize + borderThickness);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas) 
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture } );
    var sprite = new THREE.Sprite( spriteMaterial );
    sprite.scale.set(1.5, 1.5, 0);
	return sprite;	
}

// creates a point object to be added to the scene and returns it
function makePoint(x, y, z, color){
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [x,y,z], 3 ) );
    var material = new THREE.PointsMaterial( { size: 0.4, color: color } );
    var points = new THREE.Points( geometry, material );
    return points;
}

// similar to makePoint but for links
function drawLink(x1, y1, x2, y2, protocol){
    // protocols we are dealing with: UDP, TCP, CMPP, DNS
    var lineColor;
    if(protocol == "CMPP"){
        lineColor = 0xFF0000;
    }else if(protocol == "UDP"){ 
        lineColor = 0xFFFF66;
    }else if(protocol == "TCP"){ 
        lineColor = 0x8080FF;
    }else if(protocol == "DNS"){ 
        lineColor = 0x00FF80;
    }

    var material = new THREE.LineBasicMaterial( { color: lineColor, linewidth: 1 } );
    var points = [];

    points.push( new THREE.Vector3( x1, y1, 0 ) );
    points.push( new THREE.Vector3( x2, y2, 0 ) );
    
    var geometry = new THREE.BufferGeometry().setFromPoints( points );
    var line = new THREE.Line( geometry, material );
    return line;
}

function animate() {
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera( mouse, camera );
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}

export { App }