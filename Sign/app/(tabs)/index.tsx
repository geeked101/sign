import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, TextInput
} from 'react-native';
import { Image } from 'expo-image';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import StickFigureAvatar from '../../components/StickFigureAvatar';
import { buildPlaybackUnits, firstKnownIndex, SIGNS, type PlaybackUnit } from '../../lib/signs';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [skipUnknown, setSkipUnknown] = useState(true);

  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [typedText, setTypedText] = useState('');

  const [units, setUnits] = useState<PlaybackUnit[]>([]);
  const [unitIndex, setUnitIndex] = useState(0);

  const currentUnit = units[unitIndex] || null;
  const currentSignData = currentUnit?.signData ?? null;

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

  const applyInputText = (text: string) => {
    setTranscript(text);
    const nextUnits = buildPlaybackUnits(text, SIGNS);
    setUnits(nextUnits);
    const firstKnown = skipUnknown ? firstKnownIndex(nextUnits, 0) : 0;
    const nextIndex = firstKnown === -1 ? 0 : firstKnown;
    setUnitIndex(nextIndex);
    setIsPlaying(nextUnits.length > 0 && !!nextUnits[nextIndex]?.signData);
  };

  useEffect(() => {
    if (!skipUnknown) return;
    if (units.length === 0) return;
    if (unitIndex >= units.length) return;
    if (units[unitIndex]?.isKnown) return;

    const nextKnown = firstKnownIndex(units, unitIndex + 1);
    if (nextKnown === -1) {
      setIsPlaying(false);
      return;
    }

    setUnitIndex(nextKnown);
    setIsPlaying(!!units[nextKnown]?.signData);
  }, [skipUnknown, units, unitIndex]);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    console.log('Transcript received:', text);
    applyInputText(text);
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
      applyInputText('');
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
   * Displays the previous unit (phrase/word) in the transcript.
   */
  const showPrevUnit = () => {
    const newIndex = Math.max(0, unitIndex - 1);
    setUnitIndex(newIndex);
    const u = units[newIndex];
    console.log('Navigating to prev unit:', u?.text);
    setIsPlaying(!!u?.signData);
  };

  /**
   * Displays the next unit (phrase/word) in the transcript.
   */
  const showNextUnit = () => {
    const newIndex = Math.min(units.length - 1, unitIndex + 1);
    setUnitIndex(newIndex);
    const u = units[newIndex];
    console.log('Navigating to next unit:', u?.text);
    setIsPlaying(!!u?.signData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🤟 Sign</Text>
      <Text style={styles.subtitle}>KSL Interpreter</Text>

      <View style={styles.inputRow}>
        <TextInput
          value={typedText}
          onChangeText={setTypedText}
          placeholder="Type a sentence… (e.g. good morning)"
          placeholderTextColor="#666"
          style={styles.textInput}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => applyInputText(typedText)}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.typeBtn}
          onPress={() => applyInputText(typedText)}
        >
          <Text style={styles.typeBtnText}>Interpret</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, skipUnknown && styles.toggleBtnActive]}
          onPress={() => setSkipUnknown(!skipUnknown)}
        >
          <Text style={styles.toggleText}>
            {skipUnknown ? 'Skip unknown: ON' : 'Skip unknown: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Avatar Box */}
      <View style={styles.signBox}>
        {currentUnit ? (
          <StickFigureAvatar
            signData={currentSignData}
            isPlaying={isPlaying}
            speed={speed}
            onSignComplete={() => {
              if (unitIndex < units.length - 1) {
                if (skipUnknown) {
                  const nextKnown = firstKnownIndex(units, unitIndex + 1);
                  if (nextKnown === -1) {
                    setIsPlaying(false);
                    return;
                  }
                  setUnitIndex(nextKnown);
                  setIsPlaying(!!units[nextKnown]?.signData);
                  return;
                }
                showNextUnit();
              } else {
                setIsPlaying(false);
              }
            }}
          />
        ) : (
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

      {units.length > 1 && (
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={showPrevUnit} disabled={unitIndex === 0}>
            <Text style={styles.navText}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.wordCount}>{unitIndex + 1} / {units.length}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={showNextUnit} disabled={unitIndex === units.length - 1}>
            <Text style={styles.navText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.transcriptBox}>
        <Text style={styles.label}>Input:</Text>
        <ScrollView>
          <Text style={styles.transcriptText}>
            {transcript || 'Tap the mic and speak...'}
          </Text>
        </ScrollView>
      </View>

      {units.length > 0 && (
        <View style={styles.wordsRow}>
          {units.map((u, i) => {
            const isRecognized = u.isKnown;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.wordChip, 
                  i === unitIndex && styles.wordChipActive,
                  !isRecognized && styles.wordChipUnknown
                ]}
                onPress={() => {
                  setUnitIndex(i);
                  setIsPlaying(!!u.signData);
                }}
              >
                <Text style={[styles.wordText, !isRecognized && styles.wordTextUnknown]}>
                  {u.text}{!isRecognized ? ' ❓' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {currentUnit?.text && !currentUnit.isKnown && (
        <View style={styles.unknownBox}>
          <Text style={styles.unknownText}>
            I haven't learned "{currentUnit.text}" yet. 
          </Text>
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
  inputRow: { width: '100%', flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  textInput: { flex: 1, backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#eee', borderWidth: 1, borderColor: '#222' },
  typeBtn: { backgroundColor: '#1a1a2e', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#00f5a0' },
  typeBtnText: { color: '#00f5a0', fontWeight: '700' },
  settingsRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 12 },
  toggleBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#222' },
  toggleBtnActive: { borderColor: '#00f5a0', backgroundColor: '#0a2a1a' },
  toggleText: { color: '#00f5a0', fontWeight: '700', fontSize: 12 },
  wordsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  wordChip: { backgroundColor: '#16213e', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#333' },
  wordChipActive: { borderColor: '#00f5a0', backgroundColor: '#0a2a1a' },
  wordChipUnknown: { borderColor: '#ff4757', backgroundColor: '#2a0a0a' },
  wordText: { color: '#aaa', fontSize: 13 },
  wordTextUnknown: { color: '#ff4757' },
  unknownBox: { backgroundColor: '#2a0a0a', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#ff4757' },
  unknownText: { color: '#ff4757', fontSize: 12, fontWeight: '600' },
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