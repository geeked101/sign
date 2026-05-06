import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import StickFigureAvatar from '../../components/StickFigureAvatar';
import helloSign from '../../assets/signs/hello.json';
import goodSign from '../../assets/signs/good.json';
import morningSign from '../../assets/signs/morning.json';
import noonSign from '../../assets/signs/noon.json';
import afternoonSign from '../../assets/signs/afternoon.json';
import eveningSign from '../../assets/signs/evening.json';
import nightSign from '../../assets/signs/night.json';
import daySign from '../../assets/signs/day.json';
import goodMorningSign from '../../assets/signs/good-morning.json';
import goodAfternoonSign from '../../assets/signs/good-afternoon.json';
import goodEveningSign from '../../assets/signs/good-evening.json';
import goodDaySign from '../../assets/signs/good-day.json';
import goodNightSign from '../../assets/signs/good-night.json';

const SIGNS: Record<string, any> = {
  'hello': helloSign,
  'good': goodSign,
  'morning': morningSign,
  'noon': noonSign,
  'afternoon': afternoonSign,
  'evening': eveningSign,
  'night': nightSign,
  'day': daySign,
  'good morning': goodMorningSign,
  'good afternoon': goodAfternoonSign,
  'good evening': goodEveningSign,
  'good day': goodDaySign,
  'good night': goodNightSign,
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentSignData, setCurrentSignData] = useState<any>(null);

  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);

  /**
   * Request necessary permissions for speech recognition on component mount.
   */
  useEffect(() => {
    const getPermissions = async () => {
      try {
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      } catch (error) {
        console.error('Failed to request speech recognition permissions:', error);
      }
    };
    getPermissions();
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    console.log('Transcript received:', text);
    setTranscript(text);
    const split = text.toLowerCase().trim().split(' ').filter(Boolean);
    setWords(split);
    setWordIndex(0);
    if (split.length > 0) {
      const firstWord = split[0];
      console.log('Current word:', firstWord);
      console.log('Sign data:', SIGNS[firstWord]);
      setCurrentWord(firstWord);
      setCurrentSignData(SIGNS[firstWord] || null);
      setIsPlaying(!!SIGNS[firstWord]);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
  });

  /**
   * Starts the speech recognition service.
   * Resets transcript and word state before starting.
   */
  const startListening = async () => {
    try {
      setTranscript('');
      setWords([]);
      setCurrentWord('');
      setWordIndex(0);
      setListening(true);
      await ExpoSpeechRecognitionModule.start({
        lang: 'en-KE',
        interimResults: true,
        continuous: true,
      });
    } catch (error) {
      setListening(false);
      console.error('Error starting speech recognition:', error);
    }
  };

  /**
   * Stops the speech recognition service.
   */
  const stopListening = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
      setListening(false);
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };

  /**
   * Displays the previous word in the transcript.
   */
  const showPrevWord = () => {
    const newIndex = Math.max(0, wordIndex - 1);
    setWordIndex(newIndex);
    const word = words[newIndex];
    console.log('Navigating to prev word:', word);
    console.log('Sign data:', SIGNS[word]);
    setCurrentWord(word);
    setCurrentSignData(SIGNS[word] || null);
    setIsPlaying(!!SIGNS[word]);
  };

  /**
   * Displays the next word in the transcript.
   */
  const showNextWord = () => {
    const newIndex = Math.min(words.length - 1, wordIndex + 1);
    setWordIndex(newIndex);
    const word = words[newIndex];
    console.log('Navigating to next word:', word);
    console.log('Sign data:', SIGNS[word]);
    setCurrentWord(word);
    setCurrentSignData(SIGNS[word] || null);
    setIsPlaying(!!SIGNS[word]);
  };

  const currentSign = SIGNS[currentWord];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🤟 Sign</Text>
      <Text style={styles.subtitle}>KSL Interpreter</Text>
      {/* Avatar Box */}
      <View style={styles.signBox}>
        <StickFigureAvatar
          signData={currentSignData}
          isPlaying={isPlaying}
          speed={speed}
        />
        {!currentSignData && (
          <Text style={styles.placeholder}>Speak to see signs here</Text>
        )}
      </View>

      {/* Controls */}
      {currentSignData && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              setIsPlaying(!isPlaying);
            }}
          >
            <Text style={styles.controlText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setSpeed(speed === 1 ? 0.5 : 1)}
          >
            <Text style={styles.controlText}>{speed === 1 ? '🐢 Slow' : '⚡ Normal'}</Text>
          </TouchableOpacity>
        </View>
      )}

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
              onPress={() => {
                setWordIndex(i);
                setCurrentWord(word);
                setCurrentSignData(SIGNS[word] || null);
                setIsPlaying(!!SIGNS[word]);
              }}
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
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  controlBtn: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00f5a0',
  },
  controlText: {
    color: '#00f5a0',
    fontWeight: '600',
  },
});