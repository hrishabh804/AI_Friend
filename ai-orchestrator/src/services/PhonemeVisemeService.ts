import { Phoneme, Viseme } from "@/adapters/tts/TTSAdapter";

// This is a simplified mapping of phonemes to visemes.
// A real implementation would be much more sophisticated.
const phonemeToVisemeMap: { [key: string]: string } = {
  "p": "PP", "b": "PP", "m": "PP",
  "f": "FF", "v": "FF",
  "t": "DD", "d": "DD", "s": "SS", "z": "SS", "n": "nn", "l": "nn",
  "k": "kk", "g": "kk", "h": "kk",
  "i": "I", "a": "A", "u": "U", "e": "E", "o": "O",
  // ... and so on
};

class PhonemeVisemeService {
  // Placeholder method to get phonemes for a given text.
  // In a real implementation, this would use a forced aligner or a dedicated model.
  async getPhonemesForText(text: string): Promise<Phoneme[]> {
    console.log(`Getting phonemes for text: "${text}"`);
    // Return mock data for now
    return [
      { phoneme: "h", start: 0, end: 0.1 },
      { phoneme: "e", start: 0.1, end: 0.2 },
      { phoneme: "l", start: 0.2, end: 0.3 },
      { phoneme: "o", start: 0.3, end: 0.4 },
    ];
  }

  // Method to normalize a list of phonemes to a standard set of visemes.
  normalizePhonemesToVisemes(phonemes: Phoneme[]): Viseme[] {
    return phonemes.map((p) => ({
      viseme: phonemeToVisemeMap[p.phoneme] || "sil", // Default to silent if not found
      start: p.start,
      end: p.end,
    }));
  }
}

export const phonemeVisemeService = new PhonemeVisemeService();
