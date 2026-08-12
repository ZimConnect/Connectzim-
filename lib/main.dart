import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:just_audio/just_audio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:convert/convert.dart';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

// ===== API SERVICE =====
class ApiService {
  static const String baseUrl = "https://zimconnect-backend-up.onrender.com";

  static Future<List> getTV() async => jsonDecode((await http.get(Uri.parse("$baseUrl/tv"))).body);
  static Future<List> getMusic() async => jsonDecode((await http.get(Uri.parse("$baseUrl/music"))).body);
  static Future<List> getPodcast() async => jsonDecode((await http.get(Uri.parse("$baseUrl/podcast"))).body);
  static Future<List> getMarketplace() async => jsonDecode((await http.get(Uri.parse("$baseUrl/marketplace"))).body);
  static Future<List> getRadio() async => jsonDecode((await http.get(Uri.parse("$baseUrl/radio"))).body);

  static Future<String> askLodza(String question) async {
    final res = await http.post(
      Uri.parse("$baseUrl/assistant/ask"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"question": question, "user": "DJ Tewe"})
    );
    return jsonDecode(res.body)['reply'];
  }

  static Future uploadFile(String type, String title, File file) async {
    List<int> bytes = await file.readAsBytes();
    String mime = type == 'tv'? 'video/mp4' : 'audio/mp3';
    String base64 = "data:$mime;base64," + base64Encode(bytes);
    String key = type == 'tv'? "videoBase64" : type == 'music'? "musicBase64" : "podcastBase64";
    await http.post(
      Uri.parse("$baseUrl/$type/upload"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "title": title,
        "description": "Street Gear Podcast by DJ Tewe",
        key: base64,
        "host": "DJ Tewe - Street Gear",
        "brand": "Street Gear",
        "isPremium": false
      })
    );
  }
}

// ===== MAIN APP =====
void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "ZimConnect",
      theme: ThemeData(
        primaryColor: Colors.black,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.black),
        appBarTheme: AppBarTheme(backgroundColor: Colors.black),
      ),
      home: HomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class HomePage extends StatefulWidget {
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _index = 0;
  final pages = [TVScreen(), MusicScreen(), StreetGearPodcastScreen(), StreetGearShopScreen(), LodzaScreen(), MarketplaceScreen()];
  final uploadTypes = ['tv', 'music', 'podcast'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("ZimConnect x Street Gear"),
        actions: [Icon(Icons.diamond)],
      ),
      body: pages[_index],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        selectedItemColor: Colors.amber,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.black,
        onTap: (i) => setState(() => _index = i),
        items: [
          BottomNavigationBarItem(icon: Icon(Icons.tv), label: "TV"),
          BottomNavigationBarItem(icon: Icon(Icons.music_note), label: "Music"),
          BottomNavigationBarItem(icon: Icon(Icons.mic), label: "Street Gear"),
          BottomNavigationBarItem(icon: Icon(Icons.shopping_bag), label: "Shop"),
          BottomNavigationBarItem(icon: Icon(Icons.chat), label: "Lodza"),
          BottomNavigationBarItem(icon: Icon(Icons.store), label: "Market"),
        ],
      ),
      floatingActionButton: _index < 3? FloatingActionButton(
        backgroundColor: Colors.amber,
        foregroundColor: Colors.black,
        child: Icon(Icons.upload),
        onPressed: () => _showUploadDialog(context, uploadTypes[_index]),
      ) : null,
    );
  }

  void _showUploadDialog(BuildContext context, String type) {
    showDialog(context: context, builder: (_) => UploadDialog(type: type));
  }
}

// ===== TV SCREEN =====
class TVScreen extends StatefulWidget { @override _TVScreenState createState() => _TVScreenState(); }
class _TVScreenState extends State<TVScreen> {
  List videos = []; VideoPlayerController? _controller;
  @override void initState() { super.initState(); loadTV(); }
  loadTV() async { videos = await ApiService.getTV(); setState(() {}); }
  playVideo(String url) {
    _controller?.dispose();
    _controller = VideoPlayerController.network(url)..initialize().then((_) { setState(() {}); _controller!.play(); });
  }
  @override void dispose() { _controller?.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    return Column(children: [
      if(_controller!= null && _controller!.value.isInitialized) AspectRatio(aspectRatio: _controller!.value.aspectRatio, child: VideoPlayer(_controller!)),
      Expanded(child: videos.isEmpty? Center(child: CircularProgressIndicator()) : ListView.builder(itemCount: videos.length, itemBuilder: (context, i) => Card(child: ListTile(
        leading: Icon(Icons.tv, color: Colors.black),
        title: Text(videos[i]['title']?? "Zim Video"), 
        subtitle: Text(videos[i]['isPremium']? "PREMIUM" : "FREE"), 
        onTap: () => playVideo(videos[i]['videoUrl']),
      ))))
    ]);
  }
}

// ===== MUSIC + RADIO SCREEN - ZIMCONNECT RADIO 263 =====
class MusicScreen extends StatefulWidget { @override _MusicScreenState createState() => _MusicScreenState(); }
class _MusicScreenState extends State<MusicScreen> {
  List songs = []; List radio = []; final player = AudioPlayer();
  @override void initState() { super.initState(); loadData(); }
  loadData() async { songs = await ApiService.getMusic(); radio = await ApiService.getRadio(); setState(() {}); }
  play(String url) { player.setUrl(url); player.play(); }
  @override Widget build(BuildContext context) {
    return Column(children: [
      Container(color: Colors.green[900], padding: EdgeInsets.all(12), child: Column(children: [
        Text("ZimConnect Radio 263", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
        Text("Hosted by DJ Tewe 🔥", style: TextStyle(fontSize: 14, color: Colors.amber)),
      ...radio.map((r) => ListTile(leading: Icon(Icons.radio, color: Colors.red), title: Text(r['name'], style: TextStyle(color: Colors.white)), subtitle: Text("LIVE", style: TextStyle(color: Colors.white)), onTap: () => play(r['streamUrl']))),
      ])),
      Divider(), Text("Music Library", style: TextStyle(fontWeight: FontWeight.bold)),
      Expanded(child: songs.isEmpty? Center(child: CircularProgressIndicator()) : ListView.builder(itemCount: songs.length, itemBuilder: (context, i) => ListTile(
        leading: Icon(Icons.music_note, color: Colors.black), 
        title: Text(songs[i]['title']), 
        subtitle: Text(songs[i]['artist']), 
        onTap: () => play(songs[i]['musicUrl']),
      )))
    ]);
  }
}

// ===== STREET GEAR PODCAST SCREEN =====
class StreetGearPodcastScreen extends StatefulWidget { @override _StreetGearPodcastScreenState createState() => _StreetGearPodcastScreenState(); }
class _StreetGearPodcastScreenState extends State<StreetGearPodcastScreen> {
  List podcasts = []; final player = AudioPlayer();
  @override void initState() { super.initState(); loadPodcasts(); }
  loadPodcasts() async { podcasts = await ApiService.getPodcast(); setState(() {}); }
  play(String url) { player.setUrl(url); player.play(); }
  @override Widget build(BuildContext context) {
    return Column(children: [
      Container(
        color: Colors.black, 
        padding: EdgeInsets.all(16), 
        child: Row(children: [
          CircleAvatar(backgroundColor: Colors.amber, child: Icon(Icons.diamond, color: Colors.black)),
          SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text("Street Gear Podcast", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.amber)),
            Text("Hosted by DJ Tewe", style: TextStyle(fontSize: 14, color: Colors.white))
          ])
        ])
      ),
      Expanded(child: podcasts.isEmpty? Center(child: CircularProgressIndicator()) : ListView.builder(itemCount: podcasts.length, itemBuilder: (context, i) => Card(
        color: Colors.grey[900],
        child: ListTile(
          leading: Icon(Icons.mic, color: Colors.amber),
          title: Text(podcasts[i]['title'], style: TextStyle(color: Colors.white)),
          subtitle: Text("Brand: ${podcasts[i]['brand']?? 'Street Gear'} • ${podcasts[i]['isPremium']? 'PREMIUM' : 'FREE'}", style: TextStyle(color: Colors.grey)),
          trailing: IconButton(icon: Icon(Icons.play_arrow, color: Colors.amber), onPressed: () => play(podcasts[i]['podcastUrl'])),
        )
      )))
    ]);
  }
}

// ===== STREET GEAR SHOP SCREEN =====
class StreetGearShopScreen extends StatefulWidget { @override _StreetGearShopScreenState createState() => _StreetGearShopScreenState(); }
class _StreetGearShopScreenState extends State<StreetGearShopScreen> {
  List products = [
    {"name": "Blingberry Hoodie", "price": 45, "image": "🔥", "desc": "Black + Gold Street Gear"},
    {"name": "Street Gear Cap", "price": 25, "image": "🧢", "desc": "Diamond Logo"},
    {"name": "ZimConnect Tee", "price": 20, "image": "👕", "desc": "DJ Tewe Edition"},
    {"name": "Street Gear Joggers", "price": 35, "image": "👟", "desc": "Premium Cotton"},
  ];

  @override Widget build(BuildContext context) {
    return GridView.builder(
      padding: EdgeInsets.all(12),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 0.75, crossAxisSpacing: 10, mainAxisSpacing: 10),
      itemCount: products.length,
      itemBuilder: (context, i) => Card(
        color: Colors.black,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            Expanded(child: Center(child: Text(products[i]['image'], style: TextStyle(fontSize: 60)))),
            Text(products[i]['name'], style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
            Text(products[i]['desc'], style: TextStyle(color: Colors.grey, fontSize: 12)),
            Text("\$${products[i]['price']}", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black),
              onPressed: () { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Coming Soon: EcoCash Payment"))); }, 
              child: Text("Buy Now")
            )
          ],
        ),
      ),
    );
  }
}

// ===== LODZA AI SCREEN =====
class LodzaScreen extends StatefulWidget { @override _LodzaScreenState createState() => _LodzaScreenState(); }
class _LodzaScreenState extends State<LodzaScreen> {
  TextEditingController _ctrl = TextEditingController();
  String reply = "Sawubona, I am Lodza 🦅. Ask me about Street Gear or Zim!"; bool loading = false;
  ask() async { setState(() => loading = true); reply = await ApiService.askLodza(_ctrl.text); _ctrl.clear(); setState(() => loading = false); }
  @override Widget build(BuildContext context) {
    return Padding(padding: EdgeInsets.all(16), child: Column(children: [
      CircleAvatar(radius: 50, backgroundColor: Colors.black, child: Text("🦅", style: TextStyle(fontSize: 40))),
      Text("Lodza AI", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      SizedBox(height: 20), Card(child: Padding(padding: EdgeInsets.all(12), child: Text(reply))),
      TextField(controller: _ctrl, decoration: InputDecoration(labelText: "Ask Lodza...")),
      SizedBox(height: 10),
      ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: Colors.black), onPressed: loading? null : ask, child: loading? CircularProgressIndicator(color: Colors.amber) : Text("Send"))
    ]));
  }
}

// ===== MARKETPLACE SCREEN =====
class MarketplaceScreen extends StatefulWidget { @override _MarketplaceScreenState createState() => _MarketplaceScreenState(); }
class _MarketplaceScreenState extends State<MarketplaceScreen> {
  List items = [];
  @override void initState() { super.initState(); loadMarket(); }
  loadMarket() async { items = await ApiService.getMarketplace(); setState(() {}); }
  @override Widget build(BuildContext context) {
    return items.isEmpty? Center(child: CircularProgressIndicator()) : ListView.builder(itemCount: items.length, itemBuilder: (context, i) => Card(child: ListTile(
      leading: Icon(Icons.store, color: Colors.black),
      title: Text(items[i]['title']), 
      subtitle: Text("\$${items[i]['price']} - ${items[i]['location']}"), 
      trailing: Text(items[i]['category']),
    )));
  }
}

// ===== UPLOAD DIALOG =====
class UploadDialog extends StatefulWidget { final String type; UploadDialog({required this.type}); @override _UploadDialogState createState() => _UploadDialogState(); }
class _UploadDialogState extends State<UploadDialog> {
  TextEditingController titleCtrl = TextEditingController(); File? file; final picker = ImagePicker();
  pickFile() async {
    final picked = widget.type == 'tv' 
 ? await picker.pickVideo(source: ImageSource.gallery)
      : await picker.pickAudio(source: AudioSource.gallery);
    if(picked!= null) setState(() => file = File(picked.path));
  }
  upload() async {
    if(file!= null && titleCtrl.text.isNotEmpty) { await ApiService.uploadFile(widget.type, titleCtrl.text, file!); Navigator.pop(context); }
  }
  @override Widget build(BuildContext context) {
    String label = widget.type == 'tv'? 'Video' : widget.type == 'music'? 'Music' : 'Street Gear Podcast';
    return AlertDialog(title: Text("Upload $label"), content: Column(mainAxisSize: MainAxisSize.min, children: [
      TextField(controller: titleCtrl, decoration: InputDecoration(labelText: "Episode Title")),
      SizedBox(height: 10),
      ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: Colors.black), onPressed: pickFile, child: Text(file == null? "Pick Audio" : "File Selected")),
    ]), actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: Text("Cancel")),
      ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black), onPressed: upload, child: Text("Upload"))
    ]);
  }
}
