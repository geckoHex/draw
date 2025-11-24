const adverbs = [
  "Boldly", "Brightly", "Calmly", "Clearly", "Deeply", "Freely", "Gently",
  "Gladly", "Highly", "Kindly", "Lightly", "Loudly", "Madly", "Neatly",
  "Nicely", "Openly", "Poorly", "Purely", "Quickly", "Quietly", "Rarely",
  "Roughly", "Safely", "Sharply", "Softly", "Soundly", "Strongly",
  "Sweetly", "Swiftly", "Tightly", "Warmly", "Wildly", "Wisely"
];

const verbsIng = [
  "Running", "Jumping", "Dancing", "Spinning", "Falling", "Rising", "Swimming",
  "Flying", "Baking", "Laughing", "Glowing", "Flowing", "Shining", "Building",
  "Singing", "Crying", "Painting", "Racing", "Hunting", "Hiding", "Walking",
  "Rolling", "Melting", "Blooming", "Crashing", "Burning", "Sleeping",
  "Drifting", "Echoing", "Shaking", "Waving", "Wandering", "Charging",
  "Growing", "Sprinting", "Skipping", "Gliding", "Buzzing", "Barking"
];

const nouns = [
  "Ducks", "Pies", "Stars", "Dreams", "Rivers", "Clouds", "Mountains", "Waves",
  "Flowers", "Winds", "Lights", "Forests", "Birds", "Echoes", "Stories",
  "Leaves", "Cities", "Fields", "Storms", "Voices", "Sparks", "Wonders",
  "Paths", "Ideas", "Wishes", "Worlds", "Patterns", "Oceans", "Horizons",
  "Whispers", "Hearts", "Journeys", "Skies", "Songs", "Creatures"
];

export function generateBoardName(): string {
  const adv = adverbs[Math.floor(Math.random() * adverbs.length)];
  const verb = verbsIng[Math.floor(Math.random() * verbsIng.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adv} ${verb} ${noun}`;
}
