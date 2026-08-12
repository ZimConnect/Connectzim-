import 'package:flutter/material.dart';
import '../services/api_service.dart';

class LodzaScreen extends StatefulWidget {
  @override
  _LodzaScreenState createState() => _LodzaScreenState();
}

class _LodzaScreenState extends State<LodzaScreen> {
  TextEditingController _ctrl = TextEditingController();
  String reply = "Hello, I am Lodza the Zimbabwe Bird 🦅. Ask me anything about Zim!";
  bool loading = false;

  ask() async {
    setState(() => loading = true);
    reply = await ApiService.askLodza(_ctrl.text);
    _ctrl.clear();
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          CircleAvatar(radius: 50, backgroundColor: Colors.green, child: Text("🦅", style: TextStyle(fontSize: 40))), // Lodza Avatar
          Text("Lodza AI", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          SizedBox(height: 20),
          Card(child: Padding(padding: EdgeInsets.all(12), child: Text(reply))),
          TextField(controller: _ctrl, decoration: InputDecoration(labelText: "Ask Lodza...")),
          SizedBox(height: 10),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green[900]),
            onPressed: loading? null : ask, 
            child: loading? CircularProgressIndicator() : Text("Send")
          )
        ],
      ),
    );
  }
}
