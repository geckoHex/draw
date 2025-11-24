const adverbs = [
  "Boldly", "Brightly", "Calmly", "Clearly", "Deeply", "Dimly", "Freely", "Gently",
  "Gladly", "Highly", "Justly", "Kindly", "Lightly", "Loudly", "Madly", "Neatly",
  "Nicely", "Oddly", "Openly", "Poorly", "Purely", "Quickly", "Quietly", "Rarely",
  "Richly", "Roughly", "Sadly", "Safely", "Sharply", "Softly", "Soundly", "Strongly",
  "Sweetly", "Swiftly", "Tightly", "Truly", "Vainly", "Warmly", "Weakly", "Wildly",
  "Wisely", "Bravely", "Busily", "Cleanly", "Coolly", "Dearly", "Faintly", "Firmly",
  "Fondly", "Freshly", "Grandly", "Greatly", "Harshly", "Heavily", "Hotly", "Keenly",
  "Loosely", "Plainly", "Proudly", "Rapidly", "Roundly", "Smoothly", "Sternly", "Stoutly",
  "Strictly", "Surely", "Vastly", "Magically", "Mysteriously", "Wonderfully", "Eagerly",
  "Joyfully", "Playfully", "Solemnly", "Tenderly", "Vividly", "Gracefully", "Intensely"
];

const adjectives = [
  "Abstract", "Ancient", "Azure", "Beautiful", "Blue", "Bold", "Bright", "Calm",
  "Celestial", "Cosmic", "Creative", "Crimson", "Crystal", "Dancing", "Divine", "Dynamic",
  "Electric", "Elegant", "Emerald", "Endless", "Energetic", "Ethereal", "Fantastic", "Flowing",
  "Gentle", "Giant", "Glowing", "Golden", "Grand", "Green", "Happy", "Harmonic",
  "Infinite", "Inspiring", "Jade", "Joyful", "Jumping", "Kinetic", "Little", "Luminous",
  "Magic", "Majestic", "Mighty", "Mystic", "Natural", "Neon", "Noble", "Ocean",
  "Orange", "Organic", "Peaceful", "Perfect", "Playful", "Powerful", "Pure", "Purple",
  "Quiet", "Radiant", "Rapid", "Royal", "Sacred", "Serene", "Shiny", "Silent",
  "Silver", "Simple", "Solar", "Sonic", "Stellar", "Strong", "Subtle", "Super",
  "Sweet", "Tiny", "Tranquil", "Unique", "Universal", "Velvet", "Vibrant", "Vivid",
  "Warm", "Whimsical", "Wild", "Wise", "Wonder", "Yellow", "Zealous", "Zenith"
];

const nouns = [
  "Art", "Aurora", "Beacon", "Bear", "Bird", "Bloom", "Breeze", "Bridge",
  "Canvas", "Castle", "Cloud", "Comet", "Concept", "Crystal", "Dawn", "Design",
  "Dream", "Dust", "Echo", "Eclipse", "Energy", "Field", "Fire", "Flame",
  "Flow", "Flower", "Forest", "Form", "Galaxy", "Garden", "Gate", "Grove",
  "Harbor", "Haven", "Heart", "Hill", "Horizon", "Idea", "Image", "Island",
  "Journey", "Jungle", "Kite", "Lake", "Leaf", "Light", "Line", "Lotus",
  "Meadow", "Moon", "Mountain", "Music", "Mystery", "Nebula", "Night", "Oasis",
  "Ocean", "Orbit", "Path", "Pattern", "Peak", "Phase", "Picture", "Planet",
  "Prism", "Pulse", "Quest", "Rain", "Ray", "Realm", "Rhythm", "River",
  "Rose", "Sand", "Scene", "Sea", "Shadow", "Shape", "Shore", "Sky",
  "Snow", "Song", "Soul", "Sound", "Space", "Spark", "Spirit", "Star",
  "Stone", "Storm", "Stream", "Sun", "Sunset", "Tale", "Texture", "Tide",
  "Time", "Tower", "Tree", "Universe", "Valley", "View", "Vision", "Voice",
  "Voyage", "Wave", "Wind", "Wing", "Wish", "World", "Zenith"
];

export function generateBoardName(): string {
  const adv = adverbs[Math.floor(Math.random() * adverbs.length)];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adv} ${adj} ${noun}`;
}