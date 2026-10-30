import type { FlavorId, GroupId, SpiceLevel } from "./vocab";

export interface IngredientDef {
  id: string;
  label: string;
  /** Lowercase phrases matched on word boundaries. Simple plurals are handled by the matcher. */
  terms: string[];
  groups?: GroupId[];
  /** Flavor notes this ingredient reliably contributes. */
  flavors?: FlavorId[];
  /** Minimum heat this ingredient implies when present. */
  heat?: SpiceLevel;
  /** Shown in the taste-profile picker. */
  pickable?: boolean;
}

/**
 * Original lexicon written for Dishwise. Kept intentionally conservative: a term is only listed
 * when its presence in menu text near-certainly means the ingredient is in the dish.
 */
export const INGREDIENTS: IngredientDef[] = [
  // Proteins
  { id: "chicken", label: "Chicken", terms: ["chicken", "chicken sausage", "pollo", "poulet"], groups: ["poultry"], flavors: ["savory"], pickable: true },
  { id: "duck", label: "Duck", terms: ["duck", "canard"], groups: ["poultry"], flavors: ["rich", "savory"], pickable: true },
  { id: "beef", label: "Beef", terms: ["beef", "steak", "brisket", "ribeye", "sirloin", "short rib", "wagyu", "bulgogi", "carne asada", "oxtail"], groups: ["beef"], flavors: ["savory", "rich"], pickable: true },
  { id: "pork", label: "Pork", terms: ["pork", "pancetta", "guanciale", "prosciutto", "bacon", "chorizo", "carnitas", "al pastor", "chashu", "char siu", "ham", "salami", "pepperoni", "sausage"], groups: ["pork"], flavors: ["savory", "rich"], pickable: true },
  { id: "lamb", label: "Lamb", terms: ["lamb", "mutton", "goat"], groups: ["lamb"], flavors: ["savory", "rich"], pickable: true },
  { id: "salmon", label: "Salmon", terms: ["salmon", "lox"], groups: ["fish"], flavors: ["rich"], pickable: true },
  { id: "tuna", label: "Tuna", terms: ["tuna", "maguro", "ahi"], groups: ["fish"], pickable: true },
  { id: "white-fish", label: "White fish", terms: ["cod", "halibut", "sea bass", "branzino", "snapper", "tilapia", "hake", "whitefish", "white fish", "fish"], groups: ["fish"], flavors: ["fresh"], pickable: true },
  { id: "anchovy", label: "Anchovy", terms: ["anchovy", "anchovies"], groups: ["fish"], flavors: ["umami", "savory"] },
  { id: "fish-sauce", label: "Fish sauce", terms: ["fish sauce", "nam pla", "nuoc mam"], groups: ["fish"], flavors: ["umami"] },
  { id: "shrimp", label: "Shrimp", terms: ["shrimp", "prawn", "prawns", "gambas", "ebi"], groups: ["shellfish"], pickable: true },
  { id: "crab", label: "Crab", terms: ["crab"], groups: ["shellfish"], flavors: ["sweet"], pickable: true },
  { id: "lobster", label: "Lobster", terms: ["lobster"], groups: ["shellfish"], flavors: ["rich"] },
  { id: "mussels", label: "Mussels & clams", terms: ["mussel", "mussels", "clam", "clams", "oyster", "oysters", "scallop", "scallops"], groups: ["shellfish"] },
  { id: "squid", label: "Squid", terms: ["squid", "calamari", "octopus"], groups: ["shellfish"], pickable: true },
  { id: "tofu", label: "Tofu", terms: ["tofu", "bean curd"], groups: ["soy"], pickable: true },
  { id: "soybean", label: "Edamame", terms: ["edamame", "soybean", "soybeans", "soya beans"], groups: ["soy"] },
  { id: "egg", label: "Egg", terms: ["egg", "eggs", "omelette", "omelet", "frittata", "aioli", "mayo", "mayonnaise", "hollandaise"], groups: ["egg"], flavors: ["rich"], pickable: true },
  { id: "paneer", label: "Paneer", terms: ["paneer"], groups: ["dairy"], flavors: ["creamy"], pickable: true },
  { id: "chickpea", label: "Chickpeas", terms: ["chickpea", "chickpeas", "garbanzo", "chana", "falafel", "hummus"], pickable: true },
  { id: "lentils", label: "Lentils", terms: ["lentil", "lentils", "dal", "daal", "dhal"], pickable: true },
  { id: "beans", label: "Beans", terms: ["black bean", "black beans", "pinto", "refried beans", "frijoles", "beans"] },

  // Dairy
  { id: "cheese", label: "Cheese", terms: ["cheese", "mozzarella", "burrata", "parmesan", "parmigiano", "pecorino", "ricotta", "feta", "gruyere", "cheddar", "mascarpone", "gorgonzola", "goat cheese", "queso", "cotija", "halloumi", "fontina", "provolone", "manchego", "brie"], groups: ["dairy"], flavors: ["rich", "savory"], pickable: true },
  { id: "cream", label: "Cream & butter", terms: ["cream", "butter", "buttery", "ghee", "creme fraiche", "crema", "makhani"], groups: ["dairy"], flavors: ["rich", "creamy"] },
  { id: "yogurt", label: "Yogurt", terms: ["yogurt", "yoghurt", "raita", "tzatziki", "labneh", "dahi"], groups: ["dairy"], flavors: ["tangy", "creamy"] },
  { id: "milk", label: "Milk", terms: ["milk", "custard", "gelato"], groups: ["dairy"], flavors: ["creamy"] },

  // Grains & starches
  { id: "pasta", label: "Pasta", terms: ["pasta", "spaghetti", "linguine", "fettuccine", "tagliatelle", "pappardelle", "penne", "rigatoni", "gnocchi", "ravioli", "tortellini", "lasagna", "lasagne", "orecchiette", "bucatini"], groups: ["gluten"], pickable: true },
  { id: "noodles", label: "Noodles", terms: ["noodle", "noodles", "ramen", "udon", "soba", "lo mein", "chow mein"], groups: ["gluten"], pickable: true },
  { id: "rice-noodles", label: "Rice noodles", terms: ["rice noodle", "rice noodles", "pho", "vermicelli", "pad thai", "sen yai"] },
  { id: "rice", label: "Rice", terms: ["rice", "risotto", "biryani", "pilaf", "congee", "bibimbap", "paella", "arroz"], pickable: true },
  { id: "bread", label: "Bread", terms: ["bread", "sourdough", "focaccia", "baguette", "toast", "naan", "pita", "brioche", "bun", "crostini", "flatbread", "sandwich", "croissant", "roti", "paratha", "ciabatta", "banh mi"], groups: ["gluten"], pickable: true },
  { id: "tortilla", label: "Tortilla", terms: ["tortilla", "tortillas", "taco", "tacos", "burrito", "quesadilla", "enchilada", "enchiladas", "tostada"] },
  { id: "wheat-flour", label: "Wheat batter", terms: ["tempura", "battered", "breaded", "panko", "dumpling", "dumplings", "gyoza", "pastry", "pie", "pizza", "crust", "flour", "samosa", "wonton", "croutons", "katsu"], groups: ["gluten"], flavors: ["crispy"] },
  { id: "potato", label: "Potato", terms: ["potato", "potatoes", "fries", "frites", "aloo", "patatas"], pickable: true },
  { id: "corn", label: "Corn", terms: ["corn", "elote", "polenta", "masa"], flavors: ["sweet"] },

  // Vegetables & aromatics
  { id: "tomato", label: "Tomato", terms: ["tomato", "tomatoes", "marinara", "pomodoro", "passata", "salsa roja", "pico de gallo"], flavors: ["tangy", "fresh"], pickable: true },
  { id: "mushroom", label: "Mushroom", terms: ["mushroom", "mushrooms", "porcini", "shiitake", "truffle", "chanterelle", "enoki", "oyster mushroom"], flavors: ["umami", "savory"], pickable: true },
  { id: "eggplant", label: "Eggplant", terms: ["eggplant", "aubergine", "baba ganoush", "baingan", "melanzane"], pickable: true },
  { id: "spinach", label: "Spinach & greens", terms: ["spinach", "palak", "kale", "chard", "arugula", "rocket", "bok choy", "greens", "watercress"], flavors: ["fresh"], pickable: true },
  { id: "avocado", label: "Avocado", terms: ["avocado", "guacamole"], flavors: ["creamy", "fresh"], pickable: true },
  { id: "onion", label: "Onion", terms: ["onion", "onions", "shallot", "shallots", "scallion", "scallions", "leek", "leeks", "spring onion"], flavors: ["savory"], pickable: true },
  { id: "garlic", label: "Garlic", terms: ["garlic", "garlicky", "aglio", "toum"], flavors: ["savory"], pickable: true },
  { id: "bell-pepper", label: "Bell pepper", terms: ["bell pepper", "peppers", "capsicum", "pimiento", "roasted red pepper"], flavors: ["sweet"] },
  { id: "cucumber", label: "Cucumber", terms: ["cucumber", "cucumbers"], flavors: ["fresh"] },
  { id: "olives", label: "Olives", terms: ["olive", "olives", "kalamata", "tapenade"], flavors: ["savory", "bitter"], pickable: true },
  { id: "cabbage", label: "Cabbage & kimchi", terms: ["cabbage", "kimchi", "slaw", "sauerkraut"], flavors: ["tangy"] },
  { id: "cauliflower", label: "Cauliflower", terms: ["cauliflower", "gobi", "broccoli", "broccolini"] },
  { id: "beets", label: "Beets", terms: ["beet", "beets", "beetroot"], flavors: ["sweet"] },

  // Herbs, spices & heat
  { id: "cilantro", label: "Cilantro", terms: ["cilantro", "coriander leaf", "fresh coriander"], flavors: ["herby", "fresh"], pickable: true },
  { id: "basil", label: "Basil", terms: ["basil", "pesto", "thai basil", "holy basil"], flavors: ["herby", "fresh"], pickable: true },
  { id: "mint", label: "Mint", terms: ["mint"], flavors: ["herby", "fresh"] },
  { id: "dill-parsley", label: "Soft herbs", terms: ["dill", "parsley", "chives", "tarragon", "chervil", "chimichurri", "gremolata", "salsa verde", "za'atar", "zaatar"], flavors: ["herby", "fresh"] },
  { id: "lemongrass", label: "Lemongrass", terms: ["lemongrass", "galangal", "kaffir lime", "makrut lime"], flavors: ["herby", "fresh"] },
  { id: "ginger", label: "Ginger", terms: ["ginger"], flavors: ["fresh"] },
  { id: "chili", label: "Chili", terms: ["chili", "chilli", "chile", "chilies", "chillies", "jalapeno", "habanero", "serrano", "chipotle", "gochujang", "gochugaru", "sriracha", "sambal", "harissa", "nduja", "calabrian", "bird's eye", "chili oil", "chili crisp", "doubanjiang", "arrabbiata", "diavola", "vindaloo", "piri piri", "peri peri"], flavors: ["smoky"], heat: 2, pickable: true },
  { id: "sichuan-pepper", label: "Sichuan pepper", terms: ["sichuan pepper", "szechuan pepper", "mala", "numbing"], heat: 2 },
  { id: "curry-spices", label: "Warm spices", terms: ["cumin", "turmeric", "garam masala", "masala", "curry", "cardamom", "fenugreek", "tikka", "tandoori", "korma", "sumac", "baharat", "ras el hanout", "berbere"], flavors: ["savory"] },

  // Sauces, condiments & sweet
  { id: "soy-sauce", label: "Soy sauce & miso", terms: ["soy", "soy sauce", "shoyu", "tamari", "miso", "teriyaki", "hoisin", "ponzu", "black bean sauce"], groups: ["soy"], flavors: ["umami", "savory"] },
  { id: "sesame", label: "Sesame", terms: ["sesame", "tahini", "furikake", "gomae"], groups: ["sesame"], flavors: ["savory"] },
  { id: "peanut", label: "Peanuts", terms: ["peanut", "peanuts", "peanut butter", "satay", "groundnut"], groups: ["peanuts"], flavors: ["rich"] },
  { id: "tree-nut", label: "Nuts", terms: ["almond", "almonds", "almond milk", "cashew", "cashews", "walnut", "walnuts", "pistachio", "pistachios", "hazelnut", "hazelnuts", "pecan", "pecans", "pine nut", "pine nuts", "macadamia", "praline", "marzipan", "frangipane", "nutella"], groups: ["tree-nuts"], flavors: ["rich"] },
  { id: "coconut", label: "Coconut", terms: ["coconut", "coconut milk", "coconut cream"], flavors: ["creamy", "sweet"], pickable: true },
  { id: "lime-lemon", label: "Citrus", terms: ["lime", "lemon", "citrus", "yuzu", "orange", "grapefruit", "calamansi"], flavors: ["tangy", "fresh"], pickable: true },
  { id: "vinegar", label: "Pickles & vinegar", terms: ["vinegar", "pickled", "pickles", "pickle", "escabeche", "balsamic", "achar"], flavors: ["tangy"] },
  { id: "honey", label: "Honey", terms: ["honey", "hot honey"], groups: ["honey"], flavors: ["sweet"] },
  { id: "chocolate", label: "Chocolate", terms: ["chocolate", "cocoa", "cacao", "fudge", "brownie", "mole"], flavors: ["sweet", "rich", "bitter"], pickable: true },
  { id: "caramel", label: "Caramel & sugar", terms: ["caramel", "dulce de leche", "toffee", "maple", "syrup", "brown sugar", "jaggery", "candied", "glazed", "sweet chili"], flavors: ["sweet"] },
  { id: "fruit", label: "Fruit", terms: ["mango", "berries", "strawberry", "strawberries", "raspberry", "blueberry", "apple", "pear", "peach", "fig", "figs", "cherry", "cherries", "pineapple", "passion fruit", "pomegranate", "date", "dates", "lychee"], flavors: ["sweet", "fresh"], pickable: true },
  { id: "coffee", label: "Coffee", terms: ["coffee", "espresso", "tiramisu", "mocha"], flavors: ["bitter", "rich"] },
  { id: "wine", label: "Wine & spirits", terms: ["wine", "beer", "sake", "mirin", "vodka", "rum", "bourbon", "whiskey", "whisky", "tequila", "mezcal", "marsala", "brandy", "cognac", "limoncello", "prosecco", "gin"], groups: ["alcohol"] },
];

const byId = new Map(INGREDIENTS.map((i) => [i.id, i]));
export const ingredientById = (id: string): IngredientDef | undefined => byId.get(id);
export const ingredientLabel = (id: string) => byId.get(id)?.label ?? id;
export const PICKABLE_INGREDIENTS = INGREDIENTS.filter((i) => i.pickable);
