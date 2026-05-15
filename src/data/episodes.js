const episodes = [
  {
    id: 1,
    title: "The Future of AI",
    description: "We explore how artificial intelligence is reshaping industries, from healthcare to creative arts.",
    image: "https://picsum.photos/seed/ai/400/300",
    audioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "42 min",
    transcript: [
      { time: 0, text: "Welcome to the show. Today we're talking about the future of AI." },
      { time: 15, text: "AI is already being used in healthcare to detect diseases earlier than ever." },
      { time: 30, text: "Creative industries are also being transformed — from music to visual art." },
      { time: 45, text: "But what does this mean for jobs and the economy?" },
      { time: 60, text: "We think the key is humans and AI working together, not against each other." },
    ],
  },
  {
    id: 2,
    title: "Open Source Revolution",
    description: "How open source software changed the world — and what comes next for the community.",
    image: "https://picsum.photos/seed/opensource/400/300",
    audioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "38 min",
    transcript: [
      { time: 0, text: "Open source software powers most of the internet today." },
      { time: 15, text: "Linux alone runs the majority of the world's servers." },
      { time: 30, text: "The community model of collaboration changed how software gets built." },
      { time: 45, text: "But sustainability is a growing concern — who pays the maintainers?" },
      { time: 60, text: "New funding models are emerging to solve this problem." },
    ],
  },
  {
    id: 3,
    title: "Building for Billions",
    description: "Engineering challenges at massive scale: what it takes to build software used by billions.",
    image: "https://picsum.photos/seed/scale/400/300",
    audioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "55 min",
    transcript: [
      { time: 0, text: "Scaling software to billions of users is a completely different problem." },
      { time: 15, text: "A bug that affects 0.1% of users still affects one million people." },
      { time: 30, text: "Database design decisions made early can haunt you for years." },
      { time: 45, text: "The best engineers at this scale obsess over reliability and simplicity." },
      { time: 60, text: "Chaos engineering — deliberately breaking things — is how you build resilience." },
    ],
  },
];

export default episodes;