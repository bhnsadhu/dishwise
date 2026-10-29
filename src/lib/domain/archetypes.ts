import type { Course, CuisineId, FlavorId, SpiceLevel } from "./vocab";

/**
 * Well-known dishes and what they *typically* contain. Anything taken from here is recorded as
 * `inferred` (never `stated`) and explained to the user as "usually contains", because a given
 * restaurant's version may differ.
 */
export interface Archetype {
  id: string;
  label: string;
  /** Phrases matched against the dish name only. */
  names: string[];
  cuisine: CuisineId;
  course: Course;
  ingredients: string[];
  flavors: FlavorId[];
  spice?: SpiceLevel;
}

export const ARCHETYPES: Archetype[] = [
  // Italian
  { id: "margherita", label: "Margherita pizza", names: ["margherita", "margarita pizza"], cuisine: "italian", course: "main", ingredients: ["wheat-flour", "tomato", "cheese", "basil"], flavors: ["savory", "fresh"] },
  { id: "pizza", label: "Pizza", names: ["pizza"], cuisine: "italian", course: "main", ingredients: ["wheat-flour", "tomato", "cheese"], flavors: ["savory"] },
  { id: "carbonara", label: "Carbonara", names: ["carbonara"], cuisine: "italian", course: "main", ingredients: ["pasta", "egg", "pork", "cheese"], flavors: ["rich", "savory"] },
  { id: "cacio-e-pepe", label: "Cacio e pepe", names: ["cacio e pepe"], cuisine: "italian", course: "main", ingredients: ["pasta", "cheese"], flavors: ["rich", "savory"] },
  { id: "lasagna", label: "Lasagna", names: ["lasagna", "lasagne"], cuisine: "italian", course: "main", ingredients: ["pasta", "beef", "tomato", "cheese", "milk"], flavors: ["rich", "savory"] },
  { id: "risotto", label: "Risotto", names: ["risotto"], cuisine: "italian", course: "main", ingredients: ["rice", "cheese", "cream"], flavors: ["creamy", "rich"] },
  { id: "tiramisu", label: "Tiramisu", names: ["tiramisu"], cuisine: "italian", course: "dessert", ingredients: ["coffee", "cheese", "egg", "wheat-flour", "chocolate"], flavors: ["sweet", "creamy"] },
  { id: "panna-cotta", label: "Panna cotta", names: ["panna cotta"], cuisine: "italian", course: "dessert", ingredients: ["cream"], flavors: ["sweet", "creamy"] },
  { id: "arancini", label: "Arancini", names: ["arancini"], cuisine: "italian", course: "starter", ingredients: ["rice", "cheese", "wheat-flour"], flavors: ["crispy", "savory"] },
  { id: "bruschetta", label: "Bruschetta", names: ["bruschetta"], cuisine: "italian", course: "starter", ingredients: ["bread", "tomato", "garlic", "basil"], flavors: ["fresh"] },

  // Japanese
  { id: "ramen", label: "Ramen", names: ["ramen"], cuisine: "japanese", course: "main", ingredients: ["noodles", "pork", "egg", "soy-sauce", "onion"], flavors: ["umami", "savory", "rich"] },
  { id: "sushi", label: "Sushi", names: ["sushi", "nigiri", "maki", "sashimi", "hand roll", "temaki"], cuisine: "japanese", course: "main", ingredients: ["rice"], flavors: ["fresh", "umami"] },
  { id: "tempura", label: "Tempura", names: ["tempura"], cuisine: "japanese", course: "starter", ingredients: ["wheat-flour", "egg"], flavors: ["crispy"] },
  { id: "gyoza", label: "Gyoza", names: ["gyoza"], cuisine: "japanese", course: "starter", ingredients: ["wheat-flour", "pork", "cabbage", "garlic", "soy-sauce"], flavors: ["savory", "crispy"] },
  { id: "katsu", label: "Katsu", names: ["katsu", "tonkatsu"], cuisine: "japanese", course: "main", ingredients: ["wheat-flour", "egg"], flavors: ["crispy", "savory"] },
  { id: "teriyaki", label: "Teriyaki", names: ["teriyaki"], cuisine: "japanese", course: "main", ingredients: ["soy-sauce", "caramel"], flavors: ["sweet", "umami"] },
  { id: "miso-soup", label: "Miso soup", names: ["miso soup"], cuisine: "japanese", course: "starter", ingredients: ["soy-sauce", "tofu"], flavors: ["umami"] },

  // Chinese
  { id: "mapo-tofu", label: "Mapo tofu", names: ["mapo tofu", "ma po tofu"], cuisine: "chinese", course: "main", ingredients: ["tofu", "beef", "chili", "sichuan-pepper", "soy-sauce"], flavors: ["umami", "savory"], spice: 3 },
  { id: "kung-pao", label: "Kung pao", names: ["kung pao", "gong bao"], cuisine: "chinese", course: "main", ingredients: ["chicken", "peanut", "chili", "soy-sauce"], flavors: ["savory", "sweet"], spice: 2 },
  { id: "fried-rice", label: "Fried rice", names: ["fried rice"], cuisine: "chinese", course: "main", ingredients: ["rice", "egg", "soy-sauce", "onion"], flavors: ["savory", "umami"] },
  { id: "dumplings", label: "Dumplings", names: ["dumplings", "xiao long bao", "soup dumplings", "jiaozi", "wontons", "wonton soup"], cuisine: "chinese", course: "starter", ingredients: ["wheat-flour", "pork", "ginger", "soy-sauce"], flavors: ["savory"] },
  { id: "sweet-sour", label: "Sweet & sour", names: ["sweet and sour", "sweet & sour"], cuisine: "chinese", course: "main", ingredients: ["wheat-flour", "fruit", "vinegar"], flavors: ["sweet", "tangy", "crispy"] },
  { id: "dan-dan", label: "Dan dan noodles", names: ["dan dan"], cuisine: "chinese", course: "main", ingredients: ["noodles", "pork", "chili", "sichuan-pepper", "sesame", "peanut"], flavors: ["umami", "rich"], spice: 3 },

  // Korean
  { id: "bibimbap", label: "Bibimbap", names: ["bibimbap"], cuisine: "korean", course: "main", ingredients: ["rice", "egg", "spinach", "chili", "sesame"], flavors: ["savory", "umami"], spice: 1 },
  { id: "bulgogi", label: "Bulgogi", names: ["bulgogi"], cuisine: "korean", course: "main", ingredients: ["beef", "soy-sauce", "garlic", "sesame", "caramel"], flavors: ["sweet", "savory", "smoky"] },
  { id: "korean-fried-chicken", label: "Korean fried chicken", names: ["korean fried chicken", "yangnyeom"], cuisine: "korean", course: "main", ingredients: ["chicken", "wheat-flour", "chili", "garlic", "caramel"], flavors: ["crispy", "sweet"], spice: 2 },
  { id: "tteokbokki", label: "Tteokbokki", names: ["tteokbokki", "ddeokbokki"], cuisine: "korean", course: "main", ingredients: ["rice", "chili", "fish-sauce"], flavors: ["sweet", "savory"], spice: 3 },

  // Thai
  { id: "pad-thai", label: "Pad thai", names: ["pad thai"], cuisine: "thai", course: "main", ingredients: ["rice-noodles", "egg", "peanut", "fish-sauce", "lime-lemon", "tofu"], flavors: ["sweet", "tangy", "savory"], spice: 1 },
  { id: "green-curry", label: "Green curry", names: ["green curry", "gaeng keow wan"], cuisine: "thai", course: "main", ingredients: ["coconut", "chili", "basil", "fish-sauce", "lemongrass"], flavors: ["creamy", "herby"], spice: 3 },
  { id: "red-curry", label: "Red curry", names: ["red curry", "panang", "massaman"], cuisine: "thai", course: "main", ingredients: ["coconut", "chili", "fish-sauce"], flavors: ["creamy", "rich"], spice: 2 },
  { id: "tom-yum", label: "Tom yum", names: ["tom yum", "tom yam"], cuisine: "thai", course: "starter", ingredients: ["lemongrass", "chili", "lime-lemon", "fish-sauce", "mushroom"], flavors: ["tangy", "herby"], spice: 3 },
  { id: "tom-kha", label: "Tom kha", names: ["tom kha"], cuisine: "thai", course: "starter", ingredients: ["coconut", "lemongrass", "lime-lemon", "fish-sauce"], flavors: ["creamy", "tangy"], spice: 1 },
  { id: "som-tam", label: "Papaya salad", names: ["som tam", "papaya salad"], cuisine: "thai", course: "starter", ingredients: ["chili", "lime-lemon", "fish-sauce", "peanut", "tomato"], flavors: ["tangy", "fresh"], spice: 3 },
  { id: "larb", label: "Larb", names: ["larb", "laab"], cuisine: "thai", course: "starter", ingredients: ["chili", "lime-lemon", "fish-sauce", "mint", "rice"], flavors: ["tangy", "herby"], spice: 3 },
  { id: "mango-sticky-rice", label: "Mango sticky rice", names: ["mango sticky rice"], cuisine: "thai", course: "dessert", ingredients: ["rice", "fruit", "coconut"], flavors: ["sweet", "creamy"] },

  // Vietnamese
  { id: "pho", label: "Pho", names: ["pho", "phở"], cuisine: "vietnamese", course: "main", ingredients: ["rice-noodles", "beef", "onion", "basil", "lime-lemon", "fish-sauce"], flavors: ["herby", "umami", "fresh"] },
  { id: "banh-mi", label: "Banh mi", names: ["banh mi", "bánh mì"], cuisine: "vietnamese", course: "main", ingredients: ["bread", "pork", "vinegar", "cilantro", "egg", "chili"], flavors: ["fresh", "tangy", "savory"], spice: 1 },
  { id: "spring-rolls", label: "Spring rolls", names: ["spring roll", "spring rolls", "summer roll", "summer rolls", "goi cuon"], cuisine: "vietnamese", course: "starter", ingredients: ["rice-noodles", "shrimp", "mint", "cilantro"], flavors: ["fresh", "herby"] },
  { id: "bun-cha", label: "Bun cha", names: ["bun cha", "bún chả"], cuisine: "vietnamese", course: "main", ingredients: ["rice-noodles", "pork", "fish-sauce", "mint"], flavors: ["smoky", "tangy", "herby"] },

  // Indian
  { id: "butter-chicken", label: "Butter chicken", names: ["butter chicken", "murgh makhani", "chicken makhani"], cuisine: "indian", course: "main", ingredients: ["chicken", "cream", "tomato", "curry-spices"], flavors: ["rich", "creamy"], spice: 1 },
  { id: "tikka-masala", label: "Tikka masala", names: ["tikka masala"], cuisine: "indian", course: "main", ingredients: ["cream", "tomato", "yogurt", "curry-spices"], flavors: ["rich", "creamy", "smoky"], spice: 2 },
  { id: "palak-paneer", label: "Palak paneer", names: ["palak paneer", "saag paneer"], cuisine: "indian", course: "main", ingredients: ["paneer", "spinach", "cream", "garlic", "curry-spices"], flavors: ["creamy", "savory"], spice: 1 },
  { id: "biryani", label: "Biryani", names: ["biryani", "biriyani"], cuisine: "indian", course: "main", ingredients: ["rice", "curry-spices", "onion", "yogurt"], flavors: ["savory", "herby"], spice: 2 },
  { id: "vindaloo", label: "Vindaloo", names: ["vindaloo"], cuisine: "indian", course: "main", ingredients: ["chili", "vinegar", "curry-spices", "garlic"], flavors: ["tangy", "savory"], spice: 4 },
  { id: "samosa", label: "Samosa", names: ["samosa", "samosas"], cuisine: "indian", course: "starter", ingredients: ["wheat-flour", "potato", "curry-spices"], flavors: ["crispy", "savory"], spice: 1 },
  { id: "dal", label: "Dal", names: ["dal makhani", "dal tadka", "dal", "daal", "dhal"], cuisine: "indian", course: "main", ingredients: ["lentils", "curry-spices", "garlic"], flavors: ["savory", "creamy"], spice: 1 },
  { id: "naan", label: "Naan", names: ["naan"], cuisine: "indian", course: "side", ingredients: ["bread", "milk"], flavors: ["savory"] },
  { id: "chana-masala", label: "Chana masala", names: ["chana masala", "chole"], cuisine: "indian", course: "main", ingredients: ["chickpea", "tomato", "onion", "curry-spices"], flavors: ["savory", "tangy"], spice: 2 },
  { id: "gulab-jamun", label: "Gulab jamun", names: ["gulab jamun"], cuisine: "indian", course: "dessert", ingredients: ["milk", "caramel", "wheat-flour"], flavors: ["sweet"] },

  // Mexican
  { id: "tacos", label: "Tacos", names: ["taco", "tacos"], cuisine: "mexican", course: "main", ingredients: ["tortilla", "onion", "cilantro", "lime-lemon"], flavors: ["fresh", "savory"], spice: 1 },
  { id: "al-pastor", label: "Al pastor", names: ["al pastor"], cuisine: "mexican", course: "main", ingredients: ["tortilla", "pork", "fruit", "chili", "onion", "cilantro"], flavors: ["smoky", "sweet", "savory"], spice: 2 },
  { id: "burrito", label: "Burrito", names: ["burrito"], cuisine: "mexican", course: "main", ingredients: ["tortilla", "rice", "beans", "cheese"], flavors: ["savory"] },
  { id: "quesadilla", label: "Quesadilla", names: ["quesadilla"], cuisine: "mexican", course: "main", ingredients: ["tortilla", "cheese"], flavors: ["rich", "savory"] },
  { id: "enchiladas", label: "Enchiladas", names: ["enchilada", "enchiladas"], cuisine: "mexican", course: "main", ingredients: ["tortilla", "cheese", "chili", "onion"], flavors: ["savory", "rich"], spice: 2 },
  { id: "guacamole", label: "Guacamole", names: ["guacamole"], cuisine: "mexican", course: "starter", ingredients: ["avocado", "lime-lemon", "onion", "cilantro"], flavors: ["fresh", "creamy"] },
  { id: "elote", label: "Elote", names: ["elote", "esquites"], cuisine: "mexican", course: "side", ingredients: ["corn", "cheese", "egg", "chili", "lime-lemon"], flavors: ["smoky", "creamy"], spice: 1 },
  { id: "churros", label: "Churros", names: ["churro", "churros"], cuisine: "mexican", course: "dessert", ingredients: ["wheat-flour", "caramel"], flavors: ["sweet", "crispy"] },
  { id: "ceviche", label: "Ceviche", names: ["ceviche", "aguachile"], cuisine: "mexican", course: "starter", ingredients: ["white-fish", "lime-lemon", "onion", "cilantro", "chili"], flavors: ["tangy", "fresh"], spice: 1 },

  // Mediterranean & Middle Eastern
  { id: "falafel", label: "Falafel", names: ["falafel"], cuisine: "middle-eastern", course: "main", ingredients: ["chickpea", "dill-parsley", "garlic", "sesame"], flavors: ["crispy", "herby"] },
  { id: "hummus", label: "Hummus", names: ["hummus"], cuisine: "middle-eastern", course: "starter", ingredients: ["chickpea", "sesame", "garlic", "lime-lemon"], flavors: ["creamy", "savory"] },
  { id: "shawarma", label: "Shawarma", names: ["shawarma", "shawerma"], cuisine: "middle-eastern", course: "main", ingredients: ["bread", "garlic", "curry-spices"], flavors: ["savory", "smoky"] },
  { id: "shakshuka", label: "Shakshuka", names: ["shakshuka"], cuisine: "middle-eastern", course: "main", ingredients: ["egg", "tomato", "bell-pepper", "curry-spices"], flavors: ["savory", "tangy"], spice: 1 },
  { id: "baba-ganoush", label: "Baba ganoush", names: ["baba ganoush", "baba ghanoush", "mutabal"], cuisine: "middle-eastern", course: "starter", ingredients: ["eggplant", "sesame", "garlic", "lime-lemon"], flavors: ["smoky", "creamy"] },
  { id: "tabbouleh", label: "Tabbouleh", names: ["tabbouleh", "tabouli"], cuisine: "middle-eastern", course: "starter", ingredients: ["dill-parsley", "mint", "tomato", "lime-lemon", "wheat-flour"], flavors: ["fresh", "herby", "tangy"] },
  { id: "baklava", label: "Baklava", names: ["baklava"], cuisine: "middle-eastern", course: "dessert", ingredients: ["wheat-flour", "tree-nut", "honey", "cream"], flavors: ["sweet", "crispy"] },
  { id: "moussaka", label: "Moussaka", names: ["moussaka"], cuisine: "mediterranean", course: "main", ingredients: ["eggplant", "lamb", "tomato", "milk", "cheese"], flavors: ["rich", "savory"] },
  { id: "greek-salad", label: "Greek salad", names: ["greek salad", "horiatiki"], cuisine: "mediterranean", course: "starter", ingredients: ["tomato", "cucumber", "olives", "cheese", "onion"], flavors: ["fresh", "tangy"] },
  { id: "souvlaki", label: "Souvlaki", names: ["souvlaki", "gyro", "gyros"], cuisine: "mediterranean", course: "main", ingredients: ["bread", "yogurt", "garlic", "onion"], flavors: ["savory", "smoky"] },

  // French
  { id: "croque", label: "Croque monsieur", names: ["croque monsieur", "croque madame"], cuisine: "french", course: "main", ingredients: ["bread", "pork", "cheese", "milk"], flavors: ["rich", "savory"] },
  { id: "creme-brulee", label: "Crème brûlée", names: ["creme brulee", "crème brûlée"], cuisine: "french", course: "dessert", ingredients: ["cream", "egg", "caramel"], flavors: ["sweet", "creamy"] },
  { id: "steak-frites", label: "Steak frites", names: ["steak frites"], cuisine: "french", course: "main", ingredients: ["beef", "potato", "cream"], flavors: ["rich", "savory"] },
  { id: "french-onion", label: "French onion soup", names: ["french onion", "soupe a l'oignon"], cuisine: "french", course: "starter", ingredients: ["onion", "bread", "cheese", "beef", "wine"], flavors: ["rich", "umami"] },
  { id: "quiche", label: "Quiche", names: ["quiche"], cuisine: "french", course: "main", ingredients: ["egg", "cream", "wheat-flour", "cheese"], flavors: ["rich", "savory"] },

  // American
  { id: "burger", label: "Burger", names: ["burger", "cheeseburger", "smash burger"], cuisine: "american", course: "main", ingredients: ["beef", "bread", "onion"], flavors: ["savory", "rich"] },
  { id: "mac-cheese", label: "Mac & cheese", names: ["mac and cheese", "mac & cheese", "mac n cheese", "macaroni"], cuisine: "american", course: "main", ingredients: ["pasta", "cheese", "milk"], flavors: ["rich", "creamy"] },
  { id: "fried-chicken", label: "Fried chicken", names: ["fried chicken", "chicken tenders", "nashville hot"], cuisine: "american", course: "main", ingredients: ["chicken", "wheat-flour"], flavors: ["crispy", "savory"] },
  { id: "caesar", label: "Caesar salad", names: ["caesar"], cuisine: "american", course: "starter", ingredients: ["spinach", "cheese", "anchovy", "egg", "wheat-flour", "garlic"], flavors: ["savory", "tangy"] },
  { id: "bbq-ribs", label: "BBQ ribs", names: ["ribs", "bbq", "barbecue"], cuisine: "american", course: "main", ingredients: ["pork", "caramel"], flavors: ["smoky", "sweet"] },
  { id: "wings", label: "Wings", names: ["wings", "buffalo"], cuisine: "american", course: "starter", ingredients: ["chicken", "chili", "cream"], flavors: ["tangy", "crispy"], spice: 2 },
  { id: "cheesecake", label: "Cheesecake", names: ["cheesecake"], cuisine: "american", course: "dessert", ingredients: ["cheese", "egg", "wheat-flour", "caramel"], flavors: ["sweet", "creamy"] },
  { id: "brownie", label: "Brownie", names: ["brownie", "brownies"], cuisine: "american", course: "dessert", ingredients: ["chocolate", "egg", "wheat-flour", "cream"], flavors: ["sweet", "rich"] },
];
