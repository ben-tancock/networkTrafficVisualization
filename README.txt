===== DESCRIPTION ===== 

A visualization of network traffic in the format of a JSON file, filled with packet objects.
It features an array of buttons at the top to toggle a filter for each protocol,
as well as interactible nodes that, when clicked, will display graphs describing the packet
traffic being sent and recieved to/from that specific IP address, and total traffic by number of requests per protocol.


===== INSTRUCTIONS =====

in a terminal in the project root directory:
npm install
npm run build
open the index.html file
click the 'upload data' button
select the sample_pcap.json file, or any other JSON file with the same format (as long as there aren't too many packets)