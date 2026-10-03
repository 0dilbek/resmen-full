type DemoAddition = {
  cat: number;
  names: string[];
  descs: string[];
  price: number;
  allergens: string[];
  featured: boolean;
  available?: boolean;
};
export const demoAdditions: DemoAddition[] = [
  {
    cat: 3,
    names: ["Ko‘katli omlet", "Омлет с зеленью", "Garden omelette"],
    descs: [
      "Tuxum, qaymoq, ko‘kat va pomidor.",
      "Яйца, сливки, зелень и томаты.",
      "Free-range eggs, cream, fresh herbs and tomatoes.",
    ],
    price: 28000,
    allergens: ["eggs", "milk"],
    featured: false,
  },
  {
    cat: 3,
    names: ["Asalli granola", "Гранола с мёдом", "Honey granola"],
    descs: [
      "Suli, qatiq, asal va rezavorlar.",
      "Овсяные хлопья, йогурт, мёд и ягоды.",
      "Toasted oats, yoghurt, honey and seasonal berries.",
    ],
    price: 26000,
    allergens: ["gluten", "milk"],
    featured: false,
  },
  {
    cat: 4,
    names: ["Moshxo‘rda", "Машхурда", "Mung bean soup"],
    descs: [
      "Mosh, guruch, mol go‘shti va ko‘kat.",
      "Маш, рис, говядина и зелень.",
      "Mung beans, rice, tender beef and garden herbs.",
    ],
    price: 32000,
    allergens: [],
    featured: false,
  },
  {
    cat: 4,
    names: ["Qovoq sho‘rvasi", "Тыквенный суп", "Roasted pumpkin soup"],
    descs: [
      "Qovoq, sabzi, qaymoq va qovoq urug‘i.",
      "Тыква, морковь, сливки и тыквенные семечки.",
      "Roasted pumpkin, carrot, cream and toasted pumpkin seeds.",
    ],
    price: 29000,
    allergens: ["milk"],
    featured: false,
  },
  {
    cat: 5,
    names: ["Margarita", "Маргарита", "Margherita"],
    descs: [
      "Pomidor, motsarella va rayhon, yupqa xamirda.",
      "Томаты, моцарелла и базилик на тонком тесте.",
      "Tomato, mozzarella and basil on a slow-fermented crust.",
    ],
    price: 62000,
    allergens: ["gluten", "milk"],
    featured: true,
  },
  {
    cat: 5,
    names: ["Qo‘ziqorinli pitsa", "Пицца с грибами", "Woodland pizza"],
    descs: [
      "Qo‘ziqorin, pishloq, qaymoq va timyan.",
      "Грибы, сыр, сливки и тимьян.",
      "Mushrooms, aged cheese, cream and thyme.",
    ],
    price: 68000,
    allergens: ["gluten", "milk"],
    featured: false,
  },
  {
    cat: 6,
    names: ["Klassik burger", "Классический бургер", "House beef burger"],
    descs: [
      "Mol go‘shti, cheddar, salat, pomidor va bulochka.",
      "Говядина, чеддер, салат, томаты и булочка.",
      "Grilled beef, cheddar, lettuce and tomato in a toasted bun.",
    ],
    price: 48000,
    allergens: ["gluten", "milk"],
    featured: false,
  },
  {
    cat: 6,
    names: ["Sabzavotli burger", "Овощной бургер", "Garden burger"],
    descs: [
      "No‘xat kotleti, salat, pomidor va kunjutli bulochka.",
      "Котлета из нута, салат, томат и кунжутная булочка.",
      "Chickpea patty, crisp leaves and tomato on a sesame bun.",
    ],
    price: 42000,
    allergens: ["gluten", "sesame"],
    featured: false,
  },
  {
    cat: 7,
    names: ["Asalli tort", "Медовик", "Layered honey cake"],
    descs: [
      "Asalli biskvit va yengil qaymoq.",
      "Медовые коржи и лёгкий сливочный крем.",
      "Fine honey sponge layers with a light cream filling.",
    ],
    price: 28000,
    allergens: ["gluten", "milk", "eggs"],
    featured: true,
  },
  {
    cat: 8,
    names: ["Kapuchino", "Капучино", "Cappuccino"],
    descs: [
      "Espresso va ipakdek ko‘pirtirilgan sut.",
      "Эспрессо и нежная молочная пена.",
      "Double espresso with silky steamed milk.",
    ],
    price: 24000,
    allergens: ["milk"],
    featured: false,
  },
];
