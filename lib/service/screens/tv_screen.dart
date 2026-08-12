import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../services/api_service.dart';

class TVScreen extends StatefulWidget {
  @override
  _TVScreenState createState() => _TVScreenState();
}

class _TVScreenState extends State<TVScreen> {
  List videos = [];
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    loadTV();
  }

  loadTV() async {
    videos = await ApiService.getTV();
    setState(() {});
  }

  playVideo(String url) {
    _controller?.dispose();
    _controller = VideoPlayerController.network(url)..initialize().then((_) {
      setState(() {});
      _controller!.play();
    });
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return videos.isEmpty 
   ? Center(child: CircularProgressIndicator())
      : ListView.builder(
      itemCount: videos.length,
      itemBuilder: (context, i) {
        var v = videos[i];
        return Card(
          child: ListTile(
            leading: Icon(Icons.tv),
            title: Text(v['title']?? "Zim Video"),
            subtitle: Text(v['isPremium']? "PREMIUM" : "FREE"),
            onTap: () => playVideo(v['videoUrl']),
          ),
        );
      },
    );
  }
}
