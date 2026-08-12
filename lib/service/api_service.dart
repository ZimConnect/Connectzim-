import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = "https://zimconnect-backend-up.onrender.com";

  static Future<List> getTV() async {
    final res = await http.get(Uri.parse("$baseUrl/tv"));
    return jsonDecode(res.body);
  }

  static Future<List> getMusic() async {
    final res = await http.get(Uri.parse("$baseUrl/music"));
    return jsonDecode(res.body);
  }

  static Future<List> getRadio() async {
    final res = await http.get(Uri.parse("$baseUrl/radio"));
    return jsonDecode(res.body);
  }

  static Future<String> askLodza(String question) async {
    final res = await http.post(
      Uri.parse("$baseUrl/assistant/ask"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"question": question, "user": "DJ Tewe"})
    );
    return jsonDecode(res.body)['reply'];
  }
}
