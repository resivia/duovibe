window.BANKS = {
  wouldRather: [
    { a: "Always be 10 minutes late", b: "Always be 20 minutes early" },
    { a: "Live in a quiet beach house", b: "Live in a bustling city penthouse" },
    { a: "Never use social media again", b: "Never watch movies or shows again" },
    { a: "Have unlimited free travel", b: "Have unlimited free food" },
    { a: "Read your partner's mind", b: "Have your partner read your mind" }
  ],
  thisOrThat: [
    { a: "☕ Coffee", b: "🍵 Tea" },
    { a: "🌙 Night Owl", b: "🌅 Early Bird" },
    { a: "🍕 Pizza", b: "🍔 Burger" },
    { a: "🏖️ Beach", b: "⛰️ Mountains" }
  ],
  redGreenFlag: [
    "Claps when the airplane lands",
    "Remembers your exact coffee order on week 1",
    "Has 10,000 unread emails",
    "Texts 'k' as a reply"
  ],
  compatQuiz: [
    "Who's more likely to buy impulse snacks at midnight?",
    "Who's more likely to cry at a wedding?",
    "Who's a better cook?"
  ],
  blindRankItems: [
    "Tropical Vacation", "Homemade Dinner", "Surprise Gift", "Road Trip", "Movie Night"
  ],
  guessAge: [
    { subject: "Year the iPhone 1 was released", answer: 2007 },
    { subject: "Year Google was founded", answer: 1998 }
  ],
  guessCeleb: [
    { clues: ["Grammy-winning pop star born in Houston", "Formerly in a girl group"], answer: "Beyoncé" }
  ],
  bombCategories: [
    "Things found in a kitchen", "Things that are red"
  ],
  letterPrompts: [
    { category: "Animals", letter: "B" }, { category: "Foods", letter: "P" }
  ]
};

window.Picker = {
  nextItem(bankKey, bankArray) {
    if (!bankArray || !bankArray.length) return { a: "A", b: "B" };
    return bankArray[Math.floor(Math.random() * bankArray.length)];
  },
  freshNumber(min = 1, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  freshBlindRankSet(count = 5) {
    const bank = window.BANKS.blindRankItems;
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
};