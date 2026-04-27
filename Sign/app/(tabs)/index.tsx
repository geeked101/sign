import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Image
} from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const SIGNS: Record<string, string> = {
  'hello': 'https://www.handspeak.com/word/h/hel/hello.gif',
  'thank': 'https://www.handspeak.com/word/t/tha/thank-you.gif',
  'you': 'https://www.handspeak.com/word/y/you/you.gif',
  'please': 'https://www.handspeak.com/word/p/ple/please.gif',
  'help': 'https://www.handspeak.com/word/h/hel/help.gif',
  'yes': 'https://www.handspeak.com/word/y/yes/yes.gif',
  'no': 'https://www.handspeak.com/word/n/no/no.gif',
  'water': 'https://www.handspeak.com/word/w/wat/water.gif',
  'food': 'https://www.handspeak.com/word/f/foo/food.gif',
  'good': 'https://www.handspeak.com/word/g/goo/good.gif',
};

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    ExpoSpeechRecognitionModule.requestPermissionsAsync();
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setTranscript(text);
    const split = text.toLowerCase().trim().split(' ').filter(Boolean);
    setWords(split);
    setWordIndex(0);
    if (split.length > 0) setCurrentWord(split[0]);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
  });

  const startListening = async () => {
    setTranscript('');
    setWords([]);
    setCurrentWord('');
    setWordIndex(0);
    setListening(true);
    await ExpoSpeechRecognitionModule.start({
      lang: 'en-KE',
      interimResults: true,
      continuous: false,
    });
  };

  const stopListening = async () => {
    await ExpoSpeechRecognitionModule.stop();
    setListening(false);
  };

  const showPrevWord = () => {
    const newIndex = Math.max(0, wordIndex - 1);
    setWordIndex(newIndex);
    setCurrentWord(words[newIndex]);
  };

  const showNextWord = () => {
    const newIndex = Math.min(words.length - 1, wordIndex + 1);
    setWordIndex(newIndex);
    setCurrentWord(words[newIndex]);
  };

  const currentSign = SIGNS[currentWord];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🤟 Sign</Text>
      <Text style={styles.subtitle}>KSL Interpreter</Text>

      <View style={styles.signBox}>
        {currentSign ? (
          <>
            <Image
              source={{ uri: currentSign }}
              style={styles.signImage}
              resizeMode="contain"
            />
            <Text style={styles.signWord}>{currentWord.toUpperCase()}</Text>
          </>
        ) : (
          <Text style={styles.placeholder}>
            {currentWord ? `No sign yet for "${currentWord}"` : 'Speak to see signs here'}
          </Text>
        )}
      </View>

      {words.length > 1 && (
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={showPrevWord} disabled={wordIndex === 0}>
            <Text style={styles.navText}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.wordCount}>{wordIndex + 1} / {words.length}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={showNextWord} disabled={wordIndex === words.length - 1}>
            <Text style={styles.navText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.transcriptBox}>
        <Text style={styles.label}>You said:</Text>
        <ScrollView>
          <Text style={styles.transcriptText}>
            {transcript || 'Tap the mic and speak...'}
          </Text>
        </ScrollView>
      </View>

      {words.length > 0 && (
        <View style={styles.wordsRow}>
          {words.map((word, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.wordChip, i === wordIndex && styles.wordChipActive]}
              onPress={() => { setWordIndex(i); setCurrentWord(word); }}
            >
              <Text style={styles.wordText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.micButton, listening && styles.micActive]}
        onPress={listening ? stopListening : startListening}
      >
        <Text style={styles.micText}>{listening ? 'Stop' : 'Speak'}</Text>
      </TouchableOpacity>

      {listening && <Text style={styles.hint}>Listening... speak clearly</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', padding: 20, paddingTop: 40 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#00f5a0' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 20, letterSpacing: 2 },
  signBox: { width: '100%', height: 220, backgroundColor: '#1a1a2e', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#00f5a0' },
  signImage: { width: 180, height: 160 },
  signWord: { color: '#00f5a0', fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  placeholder: { color: '#444', fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 },
  navBtn: { backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#00f5a0' },
  navText: { color: '#00f5a0', fontWeight: '600' },
  wordCount: { color: '#888', fontSize: 14 },
  transcriptBox: { width: '100%', maxHeight: 80, backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  label: { color: '#00f5a0', fontSize: 10, marginBottom: 4, letterSpacing: 1 },
  transcriptText: { color: '#ccc', fontSize: 15 },
  wordsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  wordChip: { backgroundColor: '#16213e', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#333' },
  wordChipActive: { borderColor: '#00f5a0', backgroundColor: '#0a2a1a' },
  wordText: { color: '#aaa', fontSize: 13 },
  micButton: { backgroundColor: '#00f5a0', paddingVertical: 20, paddingHorizontal: 50, borderRadius: 50, marginBottom: 12 },
  micActive: { backgroundColor: '#ff4757' },
  micText: { fontSize: 20, fontWeight: 'bold', color: '#0a0a0a' },
  hint: { color: '#555', fontSize: 13 },
});