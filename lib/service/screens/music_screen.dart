import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../services/api_service.dart';

class MusicScreen extends StatefulWidget {
  @override
  _MusicScreenState createState() => _MusicScreenState();
}

class _MusicScreenState extends State<MusicScreen> {
  List songs = [];
  List radio = [];
  final player = AudioPlayer();

  @override
  void initState() {
    super.initState();
    loadData();
  }

  loadData() async {
    songs = await ApiService.getMusic();
    radio = await ApiService.getRadio(); // ZimConnect Radio 263 - DJ Tewe
    setState(() {});
  }

  play(String url) {
    player.setUrl(url);
    player.play();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: Colors.green[100],
          padding: EdgeInsets.all(12),
          child: Column(children: [
            Text("ZimConnect Radio 263 - Hosted by DJ Tewe", 
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ...radio.map((r) => ListTile(
              leading: Icon(Icons.radio, color: Colors.red),
              title: Text(r['name']),
              subtitle: Text("LIVE"),
              onTap: () => play(r['streamUrl']),
            )),
          ]),
        ),
        Divider(),
        Text("Music Library", style: TextStyle(fontWeight: FontWeight.bold)),
        Expanded(child: songs.isEmpty 
      ? Center(child: CircularProgressIndicator())
          : ListView.builder(
          itemCount: songs.length,
          itemBuilder: (context, i) => ListTile(
            leading: Icon(Icons.music_note),
            title: Text(songs[i]['title']),
            subtitle: Text(songs[i]['artist']),
            onTap: () => play(songs[i]['musicUrl']),
          ),
        ))
      ],
    );
  }
}
