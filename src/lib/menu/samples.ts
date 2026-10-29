import type { MenuInput } from "@/lib/domain/schemas";

export interface SampleMenu extends MenuInput {
  id: string;
  blurb: string;
}

/**
 * Illustrative menus written for Dishwise. The restaurants are fictional; names, dishes,
 * descriptions and prices are invented for demonstration and do not describe any real business.
 * Rankings are computed live by the engine — nothing here is pre-ranked.
 */
export const SAMPLE_MENUS: SampleMenu[] = [
  {
    id: "lantern-noodle-bar",
    title: "Lantern Noodle Bar",
    blurb: "Ramen, small plates and a few fiery bowls",
    cuisine: "japanese",
    currency: "USD",
    items: [
      { section: "Small Plates", name: "Pork Gyoza", description: "Pan-fried dumplings, cabbage, garlic, chili-soy dip", priceCents: 900 },
      { section: "Small Plates", name: "Edamame", description: "Steamed soybeans, flaky sea salt", priceCents: 600 },
      { section: "Small Plates", name: "Shrimp Tempura", description: "Crispy battered shrimp, yuzu mayo", priceCents: 1300 },
      { section: "Small Plates", name: "Cucumber Sunomono", description: "Pickled cucumber, sesame, rice vinegar. Vegan", priceCents: 700 },
      { section: "Ramen", name: "House Tonkotsu Ramen", description: "Rich 18-hour pork broth, chashu, soft egg, scallion, wood ear mushroom", priceCents: 1800 },
      { section: "Ramen", name: "Spicy Miso Ramen", description: "Miso broth, ground pork, chili oil, corn, bean sprouts, soft egg 🌶🌶", priceCents: 1700 },
      { section: "Ramen", name: "Shio Chicken Ramen", description: "Light, clear chicken broth, lemon, chicken breast, spinach", priceCents: 1600 },
      { section: "Ramen", name: "Vegan Shoyu Ramen", description: "Shiitake-kombu broth, tofu, bok choy, scallion, sesame (VG)", priceCents: 1600 },
      { section: "Rice Bowls", name: "Salmon Teriyaki Don", description: "Glazed salmon over rice, pickled ginger, furikake", priceCents: 1900 },
      { section: "Rice Bowls", name: "Chicken Katsu Curry", description: "Panko-fried chicken cutlet, Japanese curry, rice", priceCents: 1700 },
      { section: "Rice Bowls", name: "Mapo Tofu Don", description: "Silken tofu, minced beef, Sichuan pepper, fermented chili bean sauce. Very spicy", priceCents: 1600 },
      { section: "Dessert", name: "Black Sesame Ice Cream", priceCents: 700 },
      { section: "Dessert", name: "Matcha Cheesecake", description: "Green tea, graham crust", priceCents: 900 },
    ],
  },
  {
    id: "nonna-fig",
    title: "Nonna Fig Trattoria",
    blurb: "Handmade pasta, wood-fired pizza, classic dolci",
    cuisine: "italian",
    currency: "USD",
    items: [
      { section: "Antipasti", name: "Burrata", description: "Heirloom tomato, basil oil, grilled sourdough", priceCents: 1600 },
      { section: "Antipasti", name: "Arancini", description: "Crispy saffron risotto balls, mozzarella center, marinara", priceCents: 1200 },
      { section: "Antipasti", name: "Grilled Octopus", description: "Charred octopus, potato, olives, lemon, parsley", priceCents: 1900 },
      { section: "Antipasti", name: "Arugula Salad", description: "Shaved parmesan, pear, toasted walnuts, balsamic", priceCents: 1300 },
      { section: "Pasta", name: "Cacio e Pepe", description: "Tonnarelli, pecorino, cracked black pepper", priceCents: 2100 },
      { section: "Pasta", name: "Spaghetti Carbonara", description: "Guanciale, egg yolk, pecorino, black pepper", priceCents: 2300 },
      { section: "Pasta", name: "Rigatoni all'Arrabbiata", description: "Spicy tomato sauce, garlic, Calabrian chili, basil", priceCents: 1900 },
      { section: "Pasta", name: "Wild Mushroom Pappardelle", description: "Porcini, cream, thyme, parmigiano", priceCents: 2400 },
      { section: "Pasta", name: "Lobster Linguine", description: "Half lobster, cherry tomato, white wine, chili flake", priceCents: 3600 },
      { section: "Pizza", name: "Margherita", description: "San Marzano tomato, fior di latte, basil", priceCents: 1700 },
      { section: "Pizza", name: "Diavola", description: "Spicy salami, tomato, mozzarella, hot honey", priceCents: 2000 },
      { section: "Secondi", name: "Chef's Braised Short Rib", description: "Red wine braise, soft polenta, gremolata", priceCents: 3400 },
      { section: "Dolci", name: "Tiramisu", description: "Espresso-soaked ladyfingers, mascarpone, cocoa", priceCents: 1100 },
      { section: "Dolci", name: "Pistachio Panna Cotta", description: "Honey, crushed pistachio", priceCents: 1000 },
    ],
  },
  {
    id: "saffron-steps",
    title: "Saffron Steps",
    blurb: "North Indian curries, tandoor and street snacks",
    cuisine: "indian",
    currency: "USD",
    items: [
      { section: "Starters", name: "Vegetable Samosa", description: "Spiced potato and peas in crisp pastry, tamarind chutney (V)", priceCents: 800 },
      { section: "Starters", name: "Chicken 65", description: "Fried chicken bites, curry leaf, red chili. Hot", priceCents: 1200 },
      { section: "Starters", name: "Aloo Tikki Chaat", description: "Potato patties, yogurt, chickpeas, mint and tamarind chutneys", priceCents: 1000 },
      { section: "Curries", name: "Butter Chicken", description: "Tandoori chicken in a creamy tomato-butter sauce. Mild", priceCents: 1900 },
      { section: "Curries", name: "Lamb Vindaloo", description: "Fiery Goan curry, vinegar, garlic, dried chilies 🌶🌶🌶", priceCents: 2200 },
      { section: "Curries", name: "Palak Paneer", description: "Fresh spinach, house paneer, garlic, cumin (V)", priceCents: 1700 },
      { section: "Curries", name: "Chana Masala", description: "Chickpeas, tomato, onion, ginger, garam masala. Vegan", priceCents: 1500 },
      { section: "Curries", name: "Coconut Prawn Curry", description: "Kerala-style, coconut milk, curry leaves, tamarind, medium spicy", priceCents: 2300 },
      { section: "Tandoor", name: "Tandoori Salmon", description: "Yogurt-marinated salmon, charred lemon", priceCents: 2400 },
      { section: "Tandoor", name: "Paneer Tikka", description: "Smoky grilled paneer, peppers, onion", priceCents: 1700 },
      { section: "Rice & Bread", name: "Hyderabadi Chicken Biryani", description: "Basmati rice, saffron, fried onion, raita", priceCents: 2100 },
      { section: "Rice & Bread", name: "Garlic Naan", priceCents: 500 },
      { section: "Desserts", name: "Gulab Jamun", description: "Warm milk dumplings in cardamom syrup", priceCents: 700 },
      { section: "Desserts", name: "Mango Lassi", description: "Yogurt, Alphonso mango", priceCents: 600 },
    ],
  },
  {
    id: "casa-comal",
    title: "Casa Comal",
    blurb: "Tacos off the comal, ceviches and mezcal-friendly snacks",
    cuisine: "mexican",
    currency: "USD",
    items: [
      { section: "Para la mesa", name: "Guacamole & Chips", description: "Avocado, lime, serrano, cilantro, warm tortilla chips", priceCents: 1100 },
      { section: "Para la mesa", name: "Elote", description: "Grilled street corn, chipotle mayo, cotija, lime", priceCents: 700 },
      { section: "Para la mesa", name: "Shrimp Aguachile", description: "Raw shrimp cured in lime and serrano, cucumber, red onion. Spicy", priceCents: 1600 },
      { section: "Tacos", name: "Al Pastor Tacos", description: "Spit-roasted pork, pineapple, onion, cilantro", priceCents: 1400 },
      { section: "Tacos", name: "Baja Fish Tacos", description: "Beer-battered cod, cabbage slaw, crema", priceCents: 1500 },
      { section: "Tacos", name: "Mushroom Tacos", description: "Roasted oyster mushrooms, salsa verde, pickled onion. Vegan", priceCents: 1300 },
      { section: "Tacos", name: "Carne Asada Tacos", description: "Grilled steak, charred salsa roja, onion, cilantro", priceCents: 1600 },
      { section: "Platos", name: "Chicken Mole Enchiladas", description: "Rich chocolate-chile mole, sesame, queso fresco", priceCents: 2000 },
      { section: "Platos", name: "Carnitas Burrito", description: "Braised pork, rice, black beans, cheese, salsa", priceCents: 1700 },
      { section: "Platos", name: "Cheese Quesadilla", description: "Oaxaca cheese, flour tortilla, pico de gallo (V)", priceCents: 1100 },
      { section: "Postres", name: "Churros", description: "Cinnamon sugar, chocolate dipping sauce", priceCents: 900 },
      { section: "Postres", name: "Tres Leches Cake", priceCents: 1000 },
    ],
  },
  {
    id: "little-mezze",
    title: "Little Mezze",
    blurb: "Levantine dips, grills and bright salads",
    cuisine: "middle-eastern",
    currency: "USD",
    items: [
      { section: "Mezze", name: "Hummus", description: "Chickpea, tahini, lemon, olive oil, warm pita (VG)", priceCents: 900 },
      { section: "Mezze", name: "Baba Ganoush", description: "Smoked eggplant, tahini, pomegranate", priceCents: 1000 },
      { section: "Mezze", name: "Falafel", description: "Crispy chickpea fritters, herb tahini. Vegan, gluten-free", priceCents: 1000 },
      { section: "Mezze", name: "Fried Halloumi", description: "Golden halloumi, za'atar, hot honey", priceCents: 1200 },
      { section: "Mezze", name: "Fattoush", description: "Chopped tomato, cucumber, radish, sumac, crispy pita", priceCents: 1100 },
      { section: "Grill", name: "Chicken Shawarma Plate", description: "Marinated chicken thigh, garlic toum, pickles, rice", priceCents: 1900 },
      { section: "Grill", name: "Lamb Kofta", description: "Charred spiced lamb skewers, yogurt, harissa", priceCents: 2200 },
      { section: "Grill", name: "Grilled Branzino", description: "Whole fish, lemon, herbs, chermoula", priceCents: 2800 },
      { section: "Grill", name: "Cauliflower Steak", description: "Roasted cauliflower, tahini, pine nuts, herbs. Vegan", priceCents: 1700 },
      { section: "Mains", name: "Shakshuka", description: "Eggs baked in spiced tomato and pepper sauce, feta, bread", priceCents: 1600 },
      { section: "Sweets", name: "Pistachio Baklava", description: "Filo, pistachio, honey syrup", priceCents: 800 },
      { section: "Sweets", name: "Orange Blossom Rice Pudding", priceCents: 800 },
    ],
  },
];

export const sampleMenuById = (id: string) => SAMPLE_MENUS.find((m) => m.id === id);
