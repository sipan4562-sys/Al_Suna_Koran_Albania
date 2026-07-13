/* ============================================================
   IRAK — العراق — App
   i18n (ar/en/de) · Content-Rendering · 3D-Canvas-Zikkurat ·
   Tilt/Flip/Reveal-Interaktionen — ohne externe Abhängigkeiten
   ============================================================ */
(function () {
  "use strict";

  /* ================= I18N: UI-Texte ================= */
  const T = {
    de: {
      title: "Irak – Wiege der Zivilisation | العراق | Iraq",
      nav: { brand: "Entdecke den Irak", home: "Start", facts: "Fakten", history: "Geschichte", culture: "Kultur", cuisine: "Küche", places: "Orte", traditions: "Feste", travel: "Reise" },
      hero: {
        eyebrow: "بلاد الرافدين · Das Land der zwei Ströme",
        subtitle: "Irak – Wiege der Zivilisation",
        lead: "Wo vor 7.000 Jahren die erste Schrift, das Rad und die ersten Städte der Menschheit entstanden: Entdecke Kultur, Küche, Geschichte und Gegenwart des Irak – modern erzählt, in drei Sprachen.",
        cta1: "Kultur entdecken", cta2: "Zur Küche", scroll: "Scrollen"
      },
      facts: { title: "Der Irak in Zahlen", sub: "Ein junges Land auf uraltem Boden – zwischen Euphrat und Tigris." },
      history: { title: "7.000 Jahre Geschichte", sub: "Von den ersten Städten der Menschheit bis zum modernen Irak – eine Reise durch die Zeit." },
      culture: { title: "Kultur & Lebensart", sub: "Musik, Poesie, Kalligrafie und die berühmte Gastfreundschaft – die Seele des Irak." },
      cuisine: { title: "Die irakische Küche", sub: "Vom Masgouf am Tigris bis zur Kleicha zum Fest – Karten antippen und entdecken!" },
      places: { title: "Städte & Wunder", sub: "Neun Orte, die man gesehen haben muss – von Babylon bis zu den Marschen Edens." },
      traditions: { title: "Feste & Traditionen", sub: "Wie der Irak feiert, spielt und zusammenkommt – das ganze Jahr hindurch." },
      travel: { title: "Gut zu wissen", sub: "Alles, was man für eine Reise braucht – kompakt und ehrlich." },
      phrases: { title: "Kleine Sprachschule (Irakisch-Arabisch)", colAr: "Arabisch", colTr: "Aussprache" },
      footer: { tagline: "Mesopotamien – das Land zwischen Euphrat und Tigris.", made: "Mit ♥ für das Land der zwei Ströme" },
      flipHint: "Antippen zum Umdrehen",
      ingBtn: "Zutaten in 3D",
      ingTitle: "Die Zutaten – einzeln erklärt",
      ingClose: "Schließen"
    },
    en: {
      title: "Iraq – Cradle of Civilisation | العراق | Irak",
      nav: { brand: "Discover Iraq", home: "Home", facts: "Facts", history: "History", culture: "Culture", cuisine: "Cuisine", places: "Places", traditions: "Festivals", travel: "Travel" },
      hero: {
        eyebrow: "بلاد الرافدين · The Land of the Two Rivers",
        subtitle: "Iraq — Cradle of Civilisation",
        lead: "Where writing, the wheel and humanity's first cities were born 7,000 years ago: discover Iraq's culture, cuisine, history and present — told in a modern way, in three languages.",
        cta1: "Explore the culture", cta2: "Taste the cuisine", scroll: "Scroll"
      },
      facts: { title: "Iraq in numbers", sub: "A young country on ancient ground — between the Euphrates and the Tigris." },
      history: { title: "7,000 years of history", sub: "From humanity's first cities to modern Iraq — a journey through time." },
      culture: { title: "Culture & way of life", sub: "Music, poetry, calligraphy and legendary hospitality — the soul of Iraq." },
      cuisine: { title: "Iraqi cuisine", sub: "From masgouf on the Tigris to kleicha at Eid — tap the cards to explore!" },
      places: { title: "Cities & wonders", sub: "Nine places you must see — from Babylon to the marshes of Eden." },
      traditions: { title: "Festivals & traditions", sub: "How Iraq celebrates, plays and comes together — all year round." },
      travel: { title: "Good to know", sub: "Everything you need for a trip — compact and honest." },
      phrases: { title: "Mini phrasebook (Iraqi Arabic)", colAr: "Arabic", colTr: "Pronunciation" },
      footer: { tagline: "Mesopotamia — the land between the Euphrates and the Tigris.", made: "With ♥ for the land of the two rivers" },
      flipHint: "Tap to flip",
      ingBtn: "Ingredients in 3D",
      ingTitle: "The ingredients — one by one",
      ingClose: "Close"
    },
    ar: {
      title: "العراق – مهد الحضارات | Iraq | Irak",
      nav: { brand: "اكتشف العراق", home: "الرئيسية", facts: "حقائق", history: "التاريخ", culture: "الثقافة", cuisine: "المطبخ", places: "الأماكن", traditions: "الأعياد", travel: "السفر" },
      hero: {
        eyebrow: "بلاد الرافدين · أرض النهرين الخالدين",
        subtitle: "العراق — مهد الحضارات",
        lead: "هنا وُلدت الكتابة والعجلة وأولى مدن البشرية قبل سبعة آلاف سنة: اكتشف ثقافة العراق ومطبخه وتاريخه وحاضره — بسردٍ عصري وبثلاث لغات.",
        cta1: "اكتشف الثقافة", cta2: "إلى المطبخ", scroll: "مرّر للأسفل"
      },
      facts: { title: "العراق بالأرقام", sub: "بلد فتيّ على أرض عريقة — بين الفرات ودجلة." },
      history: { title: "سبعة آلاف سنة من التاريخ", sub: "من أولى مدن البشرية إلى العراق الحديث — رحلة عبر الزمن." },
      culture: { title: "الثقافة وأسلوب الحياة", sub: "الموسيقى والشعر والخط وكرم الضيافة الأسطوري — روح العراق." },
      cuisine: { title: "المطبخ العراقي", sub: "من المسكوف على دجلة إلى كليجة العيد — اضغط على البطاقات لاكتشافها!" },
      places: { title: "مدن وعجائب", sub: "تسعة أماكن لا بد من رؤيتها — من بابل إلى أهوار عدن." },
      traditions: { title: "الأعياد والتقاليد", sub: "هكذا يحتفل العراق ويلعب ويجتمع — على مدار السنة." },
      travel: { title: "معلومات تهمك", sub: "كل ما تحتاجه لرحلتك — باختصار وبصدق." },
      phrases: { title: "دليل عبارات سريع (اللهجة العراقية)", colAr: "العربية", colTr: "النطق" },
      footer: { tagline: "بلاد ما بين النهرين — أرض الفرات ودجلة.", made: "بكل ♥ لأرض الرافدين" },
      flipHint: "اضغط لقلب البطاقة",
      ingBtn: "المكونات ثلاثية الأبعاد",
      ingTitle: "المكونات — واحدًا واحدًا",
      ingClose: "إغلاق"
    }
  };

  /* ================= Zutaten (dreisprachig) ================= */
  const ING_NAMES = {
    fish: { de: "Karpfen", en: "River carp", ar: "سمك الكارب" },
    tamarind: { de: "Tamarinde", en: "Tamarind", ar: "تمر هندي" },
    turmeric: { de: "Kurkuma", en: "Turmeric", ar: "كركم" },
    salt: { de: "Salz", en: "Salt", ar: "ملح" },
    lemon: { de: "Zitrone", en: "Lemon", ar: "ليمون" },
    tomato: { de: "Tomate", en: "Tomato", ar: "طماطم" },
    onion: { de: "Zwiebel", en: "Onion", ar: "بصل" },
    fire: { de: "Offenes Feuer", en: "Open fire", ar: "نار مكشوفة" },
    vineleaf: { de: "Weinblätter", en: "Vine leaves", ar: "ورق عنب" },
    rice: { de: "Reis", en: "Rice", ar: "رز" },
    meat: { de: "Hackfleisch", en: "Minced meat", ar: "لحم مفروم" },
    pepper: { de: "Paprika", en: "Bell pepper", ar: "فلفل حلو" },
    zucchini: { de: "Zucchini", en: "Courgette", ar: "كوسا" },
    pomegranate: { de: "Granatapfelsirup", en: "Pomegranate syrup", ar: "دبس رمان" },
    spices: { de: "Baharat-Gewürze", en: "Baharat spices", ar: "بهارات" },
    bulgur: { de: "Bulgur", en: "Bulgur", ar: "برغل" },
    pinenuts: { de: "Pinienkerne", en: "Pine nuts", ar: "صنوبر" },
    raisins: { de: "Rosinen", en: "Raisins", ar: "زبيب" },
    lamb: { de: "Lammfleisch", en: "Lamb", ar: "لحم غنم" },
    saffron: { de: "Safran", en: "Saffron", ar: "زعفران" },
    almond: { de: "Mandeln", en: "Almonds", ar: "لوز" },
    cardamom: { de: "Kardamom", en: "Cardamom", ar: "هيل" },
    chicken: { de: "Hühnchen", en: "Chicken", ar: "دجاج" },
    noodles: { de: "Fadennudeln", en: "Vermicelli", ar: "شعيرية" },
    peas: { de: "Erbsen", en: "Peas", ar: "بزاليا" },
    potato: { de: "Kartoffeln", en: "Potatoes", ar: "بطاطا" },
    bread: { de: "Fladenbrot", en: "Flatbread", ar: "خبز رقيق" },
    chickpeas: { de: "Kichererbsen", en: "Chickpeas", ar: "حمص" },
    garlic: { de: "Knoblauch", en: "Garlic", ar: "ثوم" },
    loomi: { de: "Loomi (getrocknete Limette)", en: "Loomi (dried lime)", ar: "نومي بصرة" },
    flour: { de: "Mehl", en: "Flour", ar: "طحين" },
    yeast: { de: "Hefe", en: "Yeast", ar: "خميرة" },
    water: { de: "Wasser", en: "Water", ar: "ماء" },
    tannour: { de: "Tannour-Steinofen", en: "Tannour stone oven", ar: "تنور حجري" },
    sesame: { de: "Sesam", en: "Sesame", ar: "سمسم" },
    pastry: { de: "Blätterteig", en: "Flaky pastry", ar: "عجينة مورّقة" },
    ghee: { de: "Butterschmalz (Ghee)", en: "Ghee", ar: "دهن حر" },
    syrup: { de: "Zuckersirup", en: "Sugar syrup", ar: "شيرة" },
    geymar: { de: "Geymar (Büffelrahm)", en: "Geymar (buffalo cream)", ar: "قيمر" },
    dates: { de: "Datteln", en: "Dates", ar: "تمر" },
    walnut: { de: "Walnüsse", en: "Walnuts", ar: "جوز" },
    coconut: { de: "Kokos", en: "Coconut", ar: "جوز الهند" },
    rosewater: { de: "Rosenwasser", en: "Rose water", ar: "ماء الورد" },
    tea: { de: "Schwarztee", en: "Black tea", ar: "شاي أسود" },
    sugar: { de: "Zucker", en: "Sugar", ar: "سكر" }
  };

  const DISH_INGS = {
    masgouf: ["fish", "tamarind", "turmeric", "salt", "lemon", "tomato", "onion", "fire"],
    dolma: ["vineleaf", "rice", "meat", "onion", "pepper", "zucchini", "pomegranate", "spices"],
    kubba: ["bulgur", "rice", "meat", "onion", "pinenuts", "raisins", "spices"],
    quzi: ["lamb", "rice", "saffron", "almond", "raisins", "cardamom", "onion", "spices"],
    biryani: ["rice", "chicken", "noodles", "peas", "potato", "raisins", "almond", "spices"],
    tashreeb: ["bread", "lamb", "chickpeas", "onion", "tomato", "garlic", "loomi"],
    samoon: ["flour", "yeast", "water", "salt", "sesame", "tannour"],
    kahi: ["pastry", "flour", "ghee", "syrup", "geymar", "rosewater"],
    kleicha: ["flour", "dates", "cardamom", "walnut", "coconut", "ghee", "rosewater", "sesame"],
    chai: ["tea", "cardamom", "sugar", "water"]
  };

  /* ================= Inhalte (dreisprachig) ================= */

  const STATS = [
    { icon: "🏺", value: 7000, suffix: "+", label: { de: "Jahre Zivilisation", en: "years of civilisation", ar: "سنة من الحضارة" } },
    { icon: "👥", value: 46, suffix: { de: " Mio.", en: " M", ar: " مليون" }, label: { de: "Einwohner", en: "people", ar: "نسمة" } },
    { icon: "🗺️", value: 438317, suffix: " km²", label: { de: "Fläche", en: "area", ar: "المساحة" } },
    { icon: "🏛️", value: 6, suffix: "", label: { de: "UNESCO-Welterbestätten", en: "UNESCO World Heritage Sites", ar: "مواقع تراث عالمي" } },
    { icon: "🌊", value: 2, suffix: "", label: { de: "Ströme: Euphrat & Tigris", en: "great rivers: Euphrates & Tigris", ar: "نهران عظيمان: الفرات ودجلة" } },
    { icon: "🕌", value: 762, suffix: "", label: { de: "n. Chr.: Gründung Bagdads", en: "AD: founding of Baghdad", ar: "م: سنة تأسيس بغداد" } }
  ];

  const TIMELINE = [
    {
      year: { de: "ca. 3500 v. Chr.", en: "c. 3500 BC", ar: "نحو 3500 ق.م" },
      title: { de: "Sumer – die ersten Städte", en: "Sumer — the first cities", ar: "سومر — أولى المدن" },
      text: {
        de: "In Sumer entstehen mit Uruk und Eridu die ersten Städte der Menschheit. Rad, Bewässerung und Verwaltung – die urbane Revolution beginnt zwischen Euphrat und Tigris.",
        en: "In Sumer, humanity's first cities rise at Uruk and Eridu. The wheel, irrigation and administration — the urban revolution begins between the Euphrates and the Tigris.",
        ar: "في سومر تنهض أولى مدن البشرية: أوروك وإريدو. العجلة والريّ والإدارة — تبدأ الثورة الحضرية بين دجلة والفرات."
      }
    },
    {
      year: { de: "ca. 3200 v. Chr.", en: "c. 3200 BC", ar: "نحو 3200 ق.م" },
      title: { de: "Die Keilschrift", en: "Cuneiform writing", ar: "الكتابة المسمارية" },
      text: {
        de: "Die Keilschrift wird erfunden – die älteste Schrift der Welt. Auf Tontafeln entstehen später Meisterwerke wie das Gilgamesch-Epos, die erste große Dichtung der Menschheit.",
        en: "Cuneiform is invented — the world's oldest writing. Clay tablets will later carry masterpieces like the Epic of Gilgamesh, humanity's first great poem.",
        ar: "تُخترع الكتابة المسمارية، أقدم كتابة في العالم. وعلى ألواح الطين ستُدوَّن لاحقًا روائع مثل ملحمة جلجامش، أولى قصائد البشرية الكبرى."
      }
    },
    {
      year: { de: "1754 v. Chr.", en: "1754 BC", ar: "1754 ق.م" },
      title: { de: "Codex Hammurabi", en: "The Code of Hammurabi", ar: "شريعة حمورابي" },
      text: {
        de: "König Hammurabi von Babylon lässt eines der ältesten Gesetzeswerke der Geschichte in Stein meißeln – 282 Paragraphen, die Recht und Alltag regeln.",
        en: "King Hammurabi of Babylon has one of history's oldest law codes carved in stone — 282 articles governing justice and daily life.",
        ar: "يأمر الملك حمورابي البابلي بنقش واحدة من أقدم مدوّنات القوانين في التاريخ — 282 مادة تنظّم العدل والحياة اليومية."
      }
    },
    {
      year: { de: "575 v. Chr.", en: "575 BC", ar: "575 ق.م" },
      title: { de: "Babylon & das Ischtar-Tor", en: "Babylon & the Ishtar Gate", ar: "بابل وبوابة عشتار" },
      text: {
        de: "Nebukadnezar II. macht Babylon zur prächtigsten Stadt der Welt: das blau glasierte Ischtar-Tor, die Prozessionsstraße und – der Legende nach – die Hängenden Gärten.",
        en: "Nebuchadnezzar II makes Babylon the most splendid city on Earth: the blue-glazed Ishtar Gate, the Processional Way and — legend says — the Hanging Gardens.",
        ar: "يجعل نبوخذنصر الثاني بابل أبهى مدن الأرض: بوابة عشتار المزجّجة بالأزرق، وشارع الموكب، وكما تقول الأسطورة، الجنائن المعلقة."
      }
    },
    {
      year: { de: "762 n. Chr.", en: "762 AD", ar: "762 م" },
      title: { de: "Gründung Bagdads", en: "The founding of Baghdad", ar: "تأسيس بغداد" },
      text: {
        de: "Kalif al-Mansur gründet Bagdad als perfekte Rundstadt – die „Stadt des Friedens“. Wenig später ist sie mit über einer Million Einwohnern die größte Stadt der Welt.",
        en: "Caliph al-Mansur founds Baghdad as a perfect round city — the 'City of Peace'. Soon after, with over a million inhabitants, it is the largest city in the world.",
        ar: "يؤسس الخليفة المنصور بغداد مدينةً مدوّرة كاملة التصميم — «مدينة السلام». وبعد قليل تصبح بأكثر من مليون نسمة أكبر مدينة في العالم."
      }
    },
    {
      year: { de: "ca. 830 n. Chr.", en: "c. 830 AD", ar: "نحو 830 م" },
      title: { de: "Haus der Weisheit", en: "The House of Wisdom", ar: "بيت الحكمة" },
      text: {
        de: "Im Haus der Weisheit übersetzen und forschen Gelehrte aller Religionen. Al-Chwarizmi begründet die Algebra – Worte wie „Algorithmus“ tragen Bagdads Erbe bis heute.",
        en: "In the House of Wisdom, scholars of all faiths translate and research. Al-Khwarizmi founds algebra — words like 'algorithm' carry Baghdad's legacy to this day.",
        ar: "في بيت الحكمة يترجم ويبحث علماء من كل الأديان. يؤسس الخوارزمي علم الجبر، وكلمات مثل «الخوارزمية» تحمل إرث بغداد إلى اليوم."
      }
    },
    {
      year: { de: "1258 n. Chr.", en: "1258 AD", ar: "1258 م" },
      title: { de: "Der Mongolensturm", en: "The Mongol siege", ar: "الغزو المغولي" },
      text: {
        de: "Die Belagerung durch die Mongolen beendet das Goldene Zeitalter: Bibliotheken versinken im Tigris, das Abbasiden-Kalifat fällt. Es folgen Jahrhunderte unter wechselnden Reichen bis zur osmanischen Zeit.",
        en: "The Mongol siege ends the Golden Age: libraries sink into the Tigris and the Abbasid caliphate falls. Centuries under changing empires follow, down to Ottoman rule.",
        ar: "ينهي الحصار المغولي العصر الذهبي: تغرق المكتبات في دجلة وتسقط الخلافة العباسية. وتتوالى قرون تحت إمبراطوريات متعاقبة حتى الحكم العثماني."
      }
    },
    {
      year: { de: "1932 – heute", en: "1932 – today", ar: "1932 – اليوم" },
      title: { de: "Der moderne Irak", en: "Modern Iraq", ar: "العراق الحديث" },
      text: {
        de: "1932 wird der Irak unabhängig, 1958 Republik. Heute blickt ein junges Land – über die Hälfte der Bevölkerung ist unter 25 – mit neuem Selbstbewusstsein auf 7.000 Jahre Geschichte.",
        en: "Iraq gains independence in 1932 and becomes a republic in 1958. Today a young country — more than half its people are under 25 — looks back on 7,000 years of history with fresh confidence.",
        ar: "ينال العراق استقلاله عام 1932 ويصبح جمهورية عام 1958. واليوم يقف بلد فتيّ — أكثر من نصف سكانه دون الخامسة والعشرين — بثقة متجددة على إرث سبعة آلاف سنة."
      }
    }
  ];

  const CULTURE = [
    {
      icon: "🎵", arName: "المقام العراقي",
      name: { de: "Der irakische Maqam", en: "The Iraqi maqam", ar: "المقام العراقي" },
      text: {
        de: "Der irakische Maqam ist eine jahrhundertealte Kunst des gesungenen Gedichts, begleitet von Santur, Djoze und Trommel – von der UNESCO als immaterielles Kulturerbe anerkannt. Ein Konzert ist eine Reise durch Sehnsucht, Freude und Andacht.",
        en: "The Iraqi maqam is a centuries-old art of sung poetry, accompanied by santur, joza and drum — recognised by UNESCO as intangible cultural heritage. A single concert travels through longing, joy and devotion.",
        ar: "المقام العراقي فنّ عريق في غناء الشعر ترافقه آلات السنطور والجوزة والإيقاع، وقد أدرجته اليونسكو تراثًا ثقافيًا غير مادي. الحفل الواحد رحلة بين الشجن والفرح والخشوع."
      }
    },
    {
      icon: "🪕", arName: "العود",
      name: { de: "Die Oud – König der Instrumente", en: "The oud — king of instruments", ar: "العود — ملك الآلات" },
      text: {
        de: "Der birnenförmige Oud gilt als König der arabischen Instrumente – und Bagdads Schule brachte mit Munir Baschir einen der größten Meister hervor. Bis heute lernen Musiker aus aller Welt an den Ufern des Tigris.",
        en: "The pear-shaped oud is called the king of Arab instruments — and Baghdad's school produced Munir Bashir, one of its greatest masters. Musicians from around the world still come to study on the banks of the Tigris.",
        ar: "العود ملك الآلات العربية، وقد أنجبت مدرسة بغداد منير بشير أحد أعظم أساتذته. وما يزال موسيقيون من أنحاء العالم يتتلمذون على ضفاف دجلة."
      }
    },
    {
      icon: "📜", arName: "الشعر",
      name: { de: "Dichtung – der Volkssport", en: "Poetry — a national passion", ar: "الشعر — شغف وطني" },
      text: {
        de: "„Kairo schreibt, Beirut druckt, Bagdad liest“, sagt ein Sprichwort. Von al-Mutanabbi bis zur Lyrik-Pionierin Nazik al-Mala'ika – Poesie gehört im Irak zum Alltag, und der Büchermarkt der al-Mutanabbi-Straße ist ihr Herz.",
        en: "'Cairo writes, Beirut prints, Baghdad reads,' the saying goes. From al-Mutanabbi to free-verse pioneer Nazik al-Mala'ika, poetry is part of daily life in Iraq — and the book market of al-Mutanabbi Street is its beating heart.",
        ar: "يقول المثل: «القاهرة تكتب وبيروت تطبع وبغداد تقرأ». من المتنبي إلى رائدة الشعر الحر نازك الملائكة، الشعر جزء من الحياة اليومية في العراق، وسوق كتب شارع المتنبي قلبه النابض."
      }
    },
    {
      icon: "🖋️", arName: "الخط العربي",
      name: { de: "Kalligrafie", en: "Calligraphy", ar: "الخط العربي" },
      text: {
        de: "Bagdad prägte mit Meistern wie Ibn Muqla und Ibn al-Bawwab die Regeln der arabischen Kalligrafie. Aus Buchstaben wird Architektur – auf Kuppeln, in Manuskripten und heute auf Streetart-Wänden.",
        en: "With masters like Ibn Muqla and Ibn al-Bawwab, Baghdad shaped the rules of Arabic calligraphy. Letters become architecture — on domes, in manuscripts, and today on street-art walls.",
        ar: "صاغت بغداد بأساتذة مثل ابن مقلة وابن البواب قواعد الخط العربي. تتحول الحروف إلى عمارة — على القباب وفي المخطوطات، واليوم على جدران الفن الحديث."
      }
    },
    {
      icon: "☕", arName: "الكرم",
      name: { de: "Gastfreundschaft", en: "Hospitality", ar: "كرم الضيافة" },
      text: {
        de: "Ein Gast ist im Irak eine Ehre: Der beste Platz, das beste Essen und unzählige Gläser Chai gehören ihm. „Mein Haus ist dein Haus“ ist keine Floskel, sondern gelebter Alltag – vom Dorf bis in die Großstadt.",
        en: "In Iraq a guest is an honour: the best seat, the best food and endless glasses of chai are theirs. 'My house is your house' is no cliché but daily practice — from villages to big cities.",
        ar: "الضيف في العراق عزّ وشرف: له صدر المجلس وأطيب الطعام واستكانات لا تنتهي من الشاي. «بيتي بيتك» ليست مجاملة بل سلوك يومي من القرية إلى المدينة."
      }
    },
    {
      icon: "🔥", arName: "الثقافة الكردية",
      name: { de: "Kurdische Kultur", en: "Kurdish culture", ar: "الثقافة الكردية" },
      text: {
        de: "Im Norden feiern die Kurden Newroz mit Feuersprüngen und Bergpicknicks, tanzen Halparke in bunten Trachten und pflegen ihre eigene Sprache und Musik – ein eigener Kulturraum innerhalb des Irak.",
        en: "In the north, Kurds celebrate Newroz with bonfire leaps and mountain picnics, dance the halparke in bright costume, and keep their own language and music alive — a distinct cultural world within Iraq.",
        ar: "في الشمال يحتفل الكرد بنوروز بالقفز فوق النار ونزهات الجبال، ويرقصون رقصاتهم الجماعية بالأزياء الزاهية، ويصونون لغتهم وموسيقاهم — عالم ثقافي متميز داخل العراق."
      }
    },
    {
      icon: "🏺", arName: "الحِرَف والأسواق",
      name: { de: "Handwerk & Suqs", en: "Crafts & bazaars", ar: "الحِرَف والأسواق" },
      text: {
        de: "Im Kupferschmiede-Basar Suq al-Safafeer hämmern Handwerker seit der Abbasidenzeit, daneben glänzen Teppiche, Keramik und Goldschmuck. Jeder Suq ist Museum, Werkstatt und Wohnzimmer zugleich.",
        en: "In the coppersmiths' bazaar of Suq al-Safafeer, craftsmen have hammered since Abbasid times, beside glowing carpets, ceramics and gold. Every suq is museum, workshop and living room at once.",
        ar: "في سوق الصفافير يطرق النحّاسون منذ العصر العباسي، وإلى جوارهم يتلألأ السجاد والخزف والذهب. كل سوق متحفٌ وورشةٌ ومجلسٌ في آن واحد."
      }
    },
    {
      icon: "⚽", arName: "أسود الرافدين",
      name: { de: "Fußball-Leidenschaft", en: "Football passion", ar: "عشق كرة القدم" },
      text: {
        de: "Wenn die „Löwen Mesopotamiens“ spielen, steht das Land still. Der Sieg beim Asien-Cup 2007 einte den ganzen Irak in einer einzigen Jubelnacht – Fußball ist hier gelebte Einheit.",
        en: "When the 'Lions of Mesopotamia' play, the whole country stands still. Winning the 2007 Asian Cup united all of Iraq in one night of joy — football here is unity in practice.",
        ar: "حين يلعب «أسود الرافدين» يتوقف البلد كله. توّج العراق بكأس آسيا 2007 فوحّد الفرحُ الجميعَ ليلةً كاملة — كرة القدم هنا وحدةٌ تُعاش."
      }
    }
  ];

  const DISHES = [
    {
      emoji: "🐟", arName: "المسكوف",
      name: { de: "Masgouf", en: "Masgouf", ar: "المسكوف" },
      badge: { de: "Nationalgericht", en: "National dish", ar: "الطبق الوطني" },
      text: {
        de: "Das Nationalgericht des Irak: Ein Karpfen wird aufgeklappt, mit Salz, Tamarinde und Kurkuma gewürzt und stundenlang am offenen Feuer gegrillt. Am Tigrisufer in Bagdad – etwa an der Abu-Nuwas-Straße – ist Masgouf am Abend ein echtes Ritual.",
        en: "Iraq's national dish: a river carp is butterflied, seasoned with salt, tamarind and turmeric, then slow-grilled for hours beside an open fire. Eating masgouf at night on the Tigris banks of Baghdad, along Abu Nuwas Street, is a true ritual.",
        ar: "الطبق الوطني العراقي: يُشقّ سمك الكارب ويُتبّل بالملح والتمر الهندي والكركم ثم يُشوى ببطء لساعات على نار مكشوفة. تناول المسكوف مساءً على ضفاف دجلة في شارع أبي نواس ببغداد طقسٌ حقيقي."
      }
    },
    {
      emoji: "🍇", arName: "الدولمة",
      name: { de: "Dolma", en: "Dolma", ar: "الدولمة" },
      badge: { de: "Familienessen", en: "Family feast", ar: "أكلة العائلة" },
      text: {
        de: "Weinblätter, Zwiebeln, Paprika und Zucchini werden mit Reis, Hackfleisch und Gewürzen gefüllt und in einer säuerlichen Sauce geschichtet. Irakische Dolma wird traditionell auf eine große Platte gestürzt und mit der ganzen Familie geteilt.",
        en: "Vine leaves, onions, peppers and courgettes are stuffed with rice, minced meat and spices, then layered in a tangy sauce. Iraqi dolma is traditionally flipped onto one big platter and shared by the whole family.",
        ar: "تُحشى أوراق العنب والبصل والفلفل والكوسا بالرز واللحم المفروم والبهارات وتُطهى بصلصة حامضة. تُقلب الدولمة العراقية عادةً على صينية كبيرة وتُؤكل جماعةً مع العائلة كلها."
      }
    },
    {
      emoji: "🥟", arName: "الكبة",
      name: { de: "Kubba", en: "Kubba", ar: "الكبة" },
      badge: { de: "100 Varianten", en: "100 varieties", ar: "بمئة شكل" },
      text: {
        de: "Eine Hülle aus Bulgur, Reis oder Grieß umschließt eine würzige Hackfleischfüllung. Jede Region hat ihre eigene Kubba: Kubbat Mosul, flach wie ein Teller, knusprige Kubbat Halab aus Reis oder Kubbat Hamudh in säuerlicher Suppe.",
        en: "A shell of bulgur, rice or semolina wraps a spiced minced-meat filling. Every region has its own kubba: Kubbat Mosul flat like a plate, crispy rice-based Kubbat Halab, or Kubbat Hamudh simmered in tangy soup.",
        ar: "قشرة من البرغل أو الرز أو السميد تحتضن حشوة لحم متبّلة. لكل منطقة كبّتها: كبة الموصل المسطّحة كالصحن، وكبة حلب المقرمشة من الرز، وكبة الحامض التي تُطهى في المرق."
      }
    },
    {
      emoji: "🍖", arName: "القوزي",
      name: { de: "Quzi", en: "Quzi", ar: "القوزي" },
      badge: { de: "Festessen", en: "Celebration dish", ar: "طبق المناسبات" },
      text: {
        de: "Zartes Lammfleisch wird stundenlang geschmort und über safranduftendem Reis mit gerösteten Mandeln und Rosinen serviert. Quzi ist das große Festessen bei Hochzeiten und an Feiertagen – oft für die ganze Tafel auf einer Platte.",
        en: "Tender lamb is slow-roasted for hours and served over saffron-scented rice with toasted almonds and raisins. Quzi is the grand centrepiece of weddings and holidays — often one huge platter for the whole table.",
        ar: "لحم غنم طريّ يُطهى ببطء لساعات ويُقدَّم فوق رز معطّر بالزعفران مع اللوز المحمّص والزبيب. القوزي سيّد موائد الأعراس والأعياد، وغالبًا ما يُقدَّم بصينية واحدة كبيرة للجميع."
      }
    },
    {
      emoji: "🍛", arName: "البرياني",
      name: { de: "Irakisches Biryani", en: "Iraqi biryani", ar: "البرياني العراقي" },
      badge: { de: "Basar-Klassiker", en: "Bazaar classic", ar: "كلاسيكية الأسواق" },
      text: {
        de: "Die irakische Version des Biryani: goldgelber Reis mit Nudeln, Erbsen, Kartoffelwürfeln, Rosinen, Mandeln und Hühnchen. Ein buntes Alltagsgericht, das auf keinem Familientisch und in keiner Basar-Küche fehlt.",
        en: "The Iraqi take on biryani: golden rice with vermicelli, peas, diced potato, raisins, almonds and chicken. A colourful everyday favourite found on every family table and in every bazaar kitchen.",
        ar: "النسخة العراقية من البرياني: رز أصفر مع الشعيرية والبزاليا ومكعبات البطاطا والزبيب واللوز والدجاج. طبق يومي مبهج لا يغيب عن موائد العائلات ولا عن مطابخ الأسواق."
      }
    },
    {
      emoji: "🍲", arName: "التشريب",
      name: { de: "Tashreeb", en: "Tashreeb", ar: "التشريب" },
      badge: { de: "Seelenessen", en: "Comfort food", ar: "أكل البيت" },
      text: {
        de: "Dünnes Fladenbrot wird in einer kräftigen Brühe aus Lamm oder Huhn mit Kichererbsen eingeweicht, bis es die ganze Würze aufsaugt. Tashreeb ist irakisches Soulfood – besonders beliebt zum Fastenbrechen im Ramadan.",
        en: "Thin flatbread is soaked in a rich lamb or chicken broth with chickpeas until it drinks up all the spice. Tashreeb is Iraqi soul food — especially loved for breaking the fast in Ramadan.",
        ar: "يُنقَع الخبز الرقيق في مرق غنيّ من اللحم أو الدجاج مع الحمّص حتى يتشرّب كل النكهة. التشريب أكلة عراقية دافئة تحضر بقوة على موائد الإفطار في رمضان."
      }
    },
    {
      emoji: "🥖", arName: "الصمون",
      name: { de: "Samoon", en: "Samoon", ar: "الصمون" },
      badge: { de: "Täglich frisch", en: "Fresh every day", ar: "خبز كل يوم" },
      text: {
        de: "Das rautenförmige Weißbrot aus dem Steinofen ist der tägliche Begleiter jeder irakischen Mahlzeit. Vor den Bäckereien duftet es schon am frühen Morgen – Samoon isst man warm, mit Käse, Kebab oder einfach pur.",
        en: "This diamond-shaped white loaf from the stone oven accompanies every Iraqi meal. Bakeries perfume whole streets from early morning — samoon is eaten warm, with cheese, kebab, or simply on its own.",
        ar: "خبز أبيض على شكل معيّن يخرج من التنور الحجري ليرافق كل وجبة عراقية. تفوح رائحته من المخابز منذ الصباح الباكر، ويُؤكل الصمون ساخنًا مع الجبن أو الكباب أو وحده."
      }
    },
    {
      emoji: "🥞", arName: "كاهي وقيمر",
      name: { de: "Kahi & Geymar", en: "Kahi & geymar", ar: "الكاهي والقيمر" },
      badge: { de: "Frühstück der Könige", en: "Breakfast of kings", ar: "فطور الملوك" },
      text: {
        de: "Hauchdünner Blätterteig, ofenfrisch und mit Zuckersirup übergossen, dazu Geymar – dicker Rahm aus Büffelmilch. Dieses Frühstück ist ein Bagdader Wochenendritual und schmeckt nach Kindheit und Feiertag zugleich.",
        en: "Paper-thin flaky pastry, fresh from the oven and drenched in syrup, served with geymar — thick clotted cream from buffalo milk. This breakfast is a Baghdad weekend ritual that tastes of childhood and holidays at once.",
        ar: "عجينة مورّقة رقيقة تخرج ساخنة من الفرن وتُسقى بالشيرة، وتُقدَّم مع القيمر السميك من حليب الجاموس. هذا الفطور طقس بغدادي في العطلات، وطعمه يجمع الطفولة والعيد معًا."
      }
    },
    {
      emoji: "🍪", arName: "الكليجة",
      name: { de: "Kleicha", en: "Kleicha", ar: "الكليجة" },
      badge: { de: "Nationalgebäck", en: "National cookie", ar: "حلوى العيد" },
      text: {
        de: "Das Nationalgebäck des Irak: zarte Kekse, gefüllt mit Datteln, Walnüssen oder Kokos und mit Kardamom parfümiert. Vor Eid backen ganze Familien gemeinsam Bleche voller Kleicha – der Duft gehört zum Fest wie der Mond.",
        en: "Iraq's national cookie: tender pastry rings filled with dates, walnuts or coconut, perfumed with cardamom. Before Eid, whole families bake trays of kleicha together — its scent belongs to the holiday like the moon.",
        ar: "حلوى العراق الوطنية: كعك طريّ يُحشى بالتمر أو الجوز أو جوز الهند ويُعطَّر بالهيل. قبل العيد تجتمع العائلات لخبز صواني الكليجة، فرائحتها من العيد كما الهلال منه."
      }
    },
    {
      emoji: "🫖", arName: "الجاي",
      name: { de: "Chai – irakischer Tee", en: "Chai — Iraqi tea", ar: "الجاي العراقي" },
      badge: { de: "Ein Lebensgefühl", en: "A way of life", ar: "أسلوب حياة" },
      text: {
        de: "Starker, süßer Schwarztee mit Kardamom, serviert im taillierten Istikan-Glas auf einer kleinen Untertasse. Im Irak ist Chai keine Pause, sondern Sprache: Er begrüßt Gäste, besiegelt Geschäfte und beendet jede Mahlzeit.",
        en: "Strong, sweet black tea with cardamom, served in the waisted istikan glass on a tiny saucer. In Iraq, chai isn't a break — it's a language: it welcomes guests, seals deals and closes every meal.",
        ar: "شاي أسود قويّ محلّى بالهيل، يُقدَّم في استكان رفيع الخصر فوق صحن صغير. الجاي في العراق ليس استراحة بل لغة: به يُستقبل الضيف وتُختم الصفقات وتنتهي كل وجبة."
      }
    }
  ];

  const CITIES = [
    {
      emoji: "🕌", arName: "بغداد",
      name: { de: "Bagdad", en: "Baghdad", ar: "بغداد" },
      badge: { de: "Hauptstadt", en: "Capital", ar: "العاصمة" },
      text: {
        de: "762 n. Chr. als kreisrunde „Stadt des Friedens“ gegründet, war Bagdad mit dem Haus der Weisheit jahrhundertelang das intellektuelle Zentrum der Welt. Heute pulsiert die Metropole am Tigris zwischen Büchermärkten, Teehäusern und neuem Aufbruch.",
        en: "Founded in 762 AD as the circular 'City of Peace', Baghdad and its House of Wisdom were the intellectual centre of the world for centuries. Today the metropolis pulses along the Tigris with book markets, teahouses and new momentum.",
        ar: "تأسست بغداد سنة 762م «مدينةَ السلام» المدوّرة، وظلت مع بيت الحكمة مركز العالم الفكري قرونًا طويلة. واليوم تنبض العاصمة على ضفاف دجلة بأسواق الكتب والمقاهي وروح انطلاقة جديدة."
      }
    },
    {
      emoji: "🦁", arName: "بابل",
      name: { de: "Babylon", en: "Babylon", ar: "بابل" },
      badge: { de: "UNESCO", en: "UNESCO", ar: "تراث عالمي" },
      text: {
        de: "Die Stadt Hammurabis und Nebukadnezars II. mit dem Ischtar-Tor und den legendären Hängenden Gärten – einem der Sieben Weltwunder. Seit 2019 UNESCO-Welterbe, liegt Babylon nur 85 km südlich von Bagdad.",
        en: "The city of Hammurabi and Nebuchadnezzar II, home of the Ishtar Gate and the legendary Hanging Gardens — one of the Seven Wonders. A UNESCO World Heritage Site since 2019, Babylon lies just 85 km south of Baghdad.",
        ar: "مدينة حمورابي ونبوخذنصر الثاني، وموطن بوابة عشتار والجنائن المعلقة الأسطورية إحدى عجائب الدنيا السبع. أُدرجت بابل عام 2019 في قائمة التراث العالمي، وتقع على بُعد 85 كم جنوب بغداد."
      }
    },
    {
      emoji: "🏰", arName: "أربيل",
      name: { de: "Erbil", en: "Erbil", ar: "أربيل" },
      badge: { de: "6.000 Jahre bewohnt", en: "6,000 years inhabited", ar: "مأهولة منذ 6000 سنة" },
      text: {
        de: "Die Zitadelle von Erbil thront auf einem Hügel, der seit rund 6.000 Jahren ununterbrochen bewohnt ist – ein Weltrekord. Rundherum wächst die moderne Hauptstadt der Region Kurdistan mit Basaren, Cafés und Parks.",
        en: "The Citadel of Erbil crowns a mound that has been continuously inhabited for some 6,000 years — a world record. Around it grows the modern capital of the Kurdistan Region, full of bazaars, cafés and parks.",
        ar: "تتربّع قلعة أربيل على تلٍّ مأهول بلا انقطاع منذ نحو ستة آلاف سنة، وهو رقم قياسي عالمي. وحولها تنمو عاصمة إقليم كردستان الحديثة بأسواقها ومقاهيها وحدائقها."
      }
    },
    {
      emoji: "🛕", arName: "أور",
      name: { de: "Ur", en: "Ur", ar: "أور" },
      badge: { de: "ca. 2100 v. Chr.", en: "c. 2100 BC", ar: "نحو 2100 ق.م" },
      text: {
        de: "Die große Zikkurat von Ur wurde um 2100 v. Chr. für den Mondgott Nanna erbaut und ist bis heute erstaunlich gut erhalten. Der Überlieferung nach ist Ur zugleich die Geburtsstadt Abrahams.",
        en: "The Great Ziggurat of Ur was built around 2100 BC for the moon god Nanna and remains astonishingly well preserved. By tradition, Ur is also the birthplace of Abraham.",
        ar: "شُيّدت زقّورة أور العظيمة نحو 2100 ق.م لإله القمر نانا، وما تزال محفوظة بشكل مدهش حتى اليوم. وبحسب المأثور، أور هي أيضًا مدينة النبي إبراهيم."
      }
    },
    {
      emoji: "🌀", arName: "سامراء",
      name: { de: "Samarra", en: "Samarra", ar: "سامراء" },
      badge: { de: "UNESCO", en: "UNESCO", ar: "تراث عالمي" },
      text: {
        de: "Das spiralförmige Malwiya-Minarett (52 m, 9. Jahrhundert) schraubt sich wie ein Turm aus einer Legende in den Himmel – Besucher können außen hinaufsteigen. Samarra war einst Hauptstadt des Abbasiden-Reichs.",
        en: "The spiral Malwiya Minaret (52 m, 9th century) coils into the sky like a tower out of legend — visitors can climb its outer ramp. Samarra was once the capital of the Abbasid empire.",
        ar: "تلتفّ ملوية سامراء (52 مترًا، القرن التاسع) نحو السماء كبرجٍ أسطوري، ويمكن الصعود على منحدرها الخارجي. وكانت سامراء يومًا عاصمة الدولة العباسية."
      }
    },
    {
      emoji: "🌉", arName: "الموصل",
      name: { de: "Mossul", en: "Mosul", ar: "الموصل" },
      badge: { de: "Wiedergeburt", en: "Rebirth", ar: "مدينة تنهض" },
      text: {
        de: "Die Stadt am Tigris gab dem Musselin-Stoff seinen Namen und war über Jahrhunderte ein Handelsknoten zwischen Ost und West. Nach den Zerstörungen werden die Altstadt und das berühmte schiefe al-Hadba-Minarett wieder aufgebaut.",
        en: "This Tigris city gave muslin cloth its name and was a trading crossroads between East and West for centuries. After years of destruction, the old town and its famous leaning al-Hadba minaret are being rebuilt.",
        ar: "أعطت هذه المدينة على دجلة اسمها لقماش الموسلين، وكانت لقرون ملتقى تجارة الشرق والغرب. وبعد سنوات الدمار، يُعاد اليوم إعمار المدينة القديمة ومنارتها الحدباء الشهيرة."
      }
    },
    {
      emoji: "🌴", arName: "البصرة",
      name: { de: "Basra", en: "Basra", ar: "البصرة" },
      badge: { de: "Venedig des Ostens", en: "Venice of the East", ar: "بندقية الشرق" },
      text: {
        de: "Kanäle, Dattelpalmen und der Schatt al-Arab machten Basra zum „Venedig des Ostens“. Von hier stach der legendäre Sindbad in See – noch heute ist die Hafenstadt das wirtschaftliche Tor des Irak zum Golf.",
        en: "Canals, date palms and the Shatt al-Arab earned Basra the name 'Venice of the East'. Legendary Sinbad set sail from here — and the port city is still Iraq's economic gateway to the Gulf.",
        ar: "بقنواتها ونخيلها وشطّ العرب لُقّبت البصرة بـ«بندقية الشرق». من هنا أبحر السندباد الأسطوري، وما تزال المدينة بوابة العراق الاقتصادية على الخليج."
      }
    },
    {
      emoji: "🌙", arName: "النجف وكربلاء",
      name: { de: "Nadschaf & Kerbela", en: "Najaf & Karbala", ar: "النجف وكربلاء" },
      badge: { de: "Heilige Städte", en: "Holy cities", ar: "مدن مقدسة" },
      text: {
        de: "Die Schreine von Imam Ali in Nadschaf und Imam Hussein in Kerbela gehören zu den bedeutendsten Heiligtümern der islamischen Welt. Zur Arbain-Wallfahrt gehen jedes Jahr Millionen Menschen zu Fuß nach Kerbela.",
        en: "The shrines of Imam Ali in Najaf and Imam Hussein in Karbala are among the most significant sanctuaries of the Islamic world. Every year, millions walk to Karbala for the Arba'een pilgrimage.",
        ar: "مرقدا الإمام علي في النجف والإمام الحسين في كربلاء من أعظم مقامات العالم الإسلامي. وفي زيارة الأربعين يمشي ملايين الزوار كل عام إلى كربلاء."
      }
    },
    {
      emoji: "🛶", arName: "الأهوار",
      name: { de: "Die Marschen (Ahwar)", en: "The Marshes (Ahwar)", ar: "الأهوار" },
      badge: { de: "UNESCO", en: "UNESCO", ar: "تراث عالمي" },
      text: {
        de: "In den mesopotamischen Marschen leben die Ma'dan seit Jahrtausenden in kunstvollen Schilfhäusern (Mudhif) zwischen Wasserbüffeln und Vogelschwärmen. Viele verorten in diesem einzigartigen Wasserlabyrinth den Garten Eden.",
        en: "In the Mesopotamian Marshes, the Ma'dan have lived for millennia in elegant reed houses (mudhif) among water buffalo and flocks of birds. Many place the Garden of Eden in this unique water labyrinth.",
        ar: "في الأهوار يعيش المعدان منذ آلاف السنين في بيوت قصب بديعة (المضيف) بين جواميس الماء وأسراب الطيور. ويرى كثيرون أن هذه المتاهة المائية الفريدة هي موضع جنة عدن."
      }
    }
  ];

  const TRADITIONS = [
    {
      icon: "🌙", arName: "رمضان والمحيبس",
      name: { de: "Ramadan & Mheibes", en: "Ramadan & mheibes", ar: "رمضان والمحيبس" },
      text: {
        de: "Im Ramadan verwandeln sich die Nächte in Feste: Nach dem Iftar spielen ganze Stadtviertel Mheibes – ein uraltes Versteckspiel um einen Ring, bei dem Teams die Gesichter der Gegner lesen müssen.",
        en: "In Ramadan the nights become festivals: after iftar, whole neighbourhoods play mheibes — an ancient ring-hiding game where teams must read their opponents' faces.",
        ar: "في رمضان تتحول الليالي إلى أعياد: بعد الإفطار تتبارى المحلات بلعبة المحيبس — لعبة عريقة في إخفاء الخاتم تُقرأ فيها وجوه الخصوم."
      }
    },
    {
      icon: "🎉", arName: "الأعياد",
      name: { de: "Eid-Feste", en: "Eid celebrations", ar: "عيدا الفطر والأضحى" },
      text: {
        de: "Zu Eid al-Fitr und Eid al-Adha duftet es nach Kleicha, Kinder bekommen Eidiya (Festtagsgeld) und neue Kleidung, Familien besuchen einander tagelang. Die Städte leuchten, Schaukeln und Karussells füllen die Plätze.",
        en: "At Eid al-Fitr and Eid al-Adha the air smells of kleicha, children receive eidiya (holiday money) and new clothes, and families visit each other for days. Cities light up as swings and carousels fill the squares.",
        ar: "في عيدي الفطر والأضحى تفوح رائحة الكليجة، وينال الأطفال العيدية والثياب الجديدة، وتتبادل العائلات الزيارات أيامًا. تتزين المدن وتمتلئ الساحات بالمراجيح."
      }
    },
    {
      icon: "🔥", arName: "نوروز",
      name: { de: "Newroz", en: "Newroz", ar: "نوروز" },
      text: {
        de: "Am 21. März begrüßen die Kurden mit Newroz das neue Jahr und den Frühling: Fackelzüge ziehen die Berge hinauf, Familien picknicken zwischen Blumenwiesen, und über allem tanzt das Feuer als Zeichen der Freiheit.",
        en: "On 21 March, Kurds welcome the new year and spring with Newroz: torch processions climb the mountains, families picnic in flowering meadows, and fire dances over it all as a sign of freedom.",
        ar: "في 21 آذار يستقبل الكرد العام الجديد والربيع بنوروز: مواكب المشاعل تصعد الجبال، والعائلات تفترش المروج المزهرة، والنار ترقص فوق كل شيء رمزًا للحرية."
      }
    },
    {
      icon: "🚶", arName: "زيارة الأربعين",
      name: { de: "Arbain-Wallfahrt", en: "Arba'een pilgrimage", ar: "زيارة الأربعين" },
      text: {
        de: "Millionen Menschen gehen jedes Jahr tagelang zu Fuß nach Kerbela – die größte jährliche Versammlung der Welt. Entlang der Wege verschenken Freiwillige in Mawakib Essen, Tee und Schlafplätze an jeden, der vorbeikommt.",
        en: "Every year millions walk for days to Karbala — the world's largest annual gathering. Along the routes, volunteers in mawakib offer food, tea and a place to sleep to everyone passing by.",
        ar: "يمشي الملايين كل عام أيامًا نحو كربلاء في أكبر تجمّع سنوي في العالم. وعلى الطرقات تقدّم المواكب الطعام والشاي والمبيت لكل عابر سبيل مجانًا."
      }
    },
    {
      icon: "💍", arName: "الأعراس",
      name: { de: "Hochzeiten", en: "Weddings", ar: "الأعراس العراقية" },
      text: {
        de: "Irakische Hochzeiten dauern oft mehrere Tage: Henna-Abend für die Braut, Zaffa-Umzug mit Trommeln, Dabke-Tanz bis in die Nacht und die Jubeltriller (Zaghareed) der Frauen. Hunderte Gäste sind keine Seltenheit.",
        en: "Iraqi weddings often last several days: a henna night for the bride, a zaffa procession with drums, dabke dancing late into the night and the women's joy-trills (zaghareed). Hundreds of guests are not unusual.",
        ar: "قد تمتد الأعراس العراقية أيامًا: ليلة الحنّاء للعروس، وزفّة بالطبول، ودبكة حتى آخر الليل، وزغاريد النساء. ومئات المدعوين أمر مألوف."
      }
    },
    {
      icon: "🌆", arName: "أماسي دجلة",
      name: { de: "Abende am Tigris", en: "Evenings on the Tigris", ar: "أماسي دجلة" },
      text: {
        de: "Wenn die Hitze weicht, gehören die Flussufer den Familien: Masgouf-Feuer glühen, Dominosteine klackern in Teehäusern, Spaziergänger flanieren über die Abu-Nuwas-Promenade. Der Abend ist im Irak die schönste Tageszeit.",
        en: "When the heat fades, the riverbanks belong to families: masgouf fires glow, dominoes clack in teahouses, and strollers fill the Abu Nuwas promenade. In Iraq, evening is the finest time of day.",
        ar: "حين ينكسر الحر تعود الضفاف للعائلات: نيران المسكوف تتوهج، وأحجار الدومينو تقرقع في المقاهي، والمتنزهون يملؤون كورنيش أبي نواس. المساء في العراق أجمل أوقات اليوم."
      }
    }
  ];

  const TRAVEL = [
    {
      icon: "🗓️", arName: "أفضل وقت للزيارة",
      name: { de: "Beste Reisezeit", en: "Best time to visit", ar: "أفضل وقت للزيارة" },
      text: {
        de: "Oktober bis April ist ideal: mild und grün. Der Sommer (Juni–August) erreicht 45–50 °C – dann lieber in die kühleren Berge Kurdistans ausweichen.",
        en: "October to April is ideal: mild and green. Summer (June–August) reaches 45–50 °C — better to escape to the cooler mountains of Kurdistan then.",
        ar: "من تشرين الأول إلى نيسان الوقت الأمثل: طقس معتدل وخضرة. أما الصيف (حزيران–آب) فيبلغ 45–50 درجة، والأفضل حينها اللجوء إلى جبال كردستان الأبرد."
      }
    },
    {
      icon: "💵", arName: "العملة",
      name: { de: "Währung", en: "Currency", ar: "العملة" },
      text: {
        de: "Bezahlt wird mit dem Irakischen Dinar (IQD); US-Dollar werden vielerorts akzeptiert. Bargeld ist König – Kreditkarten funktionieren nur in großen Hotels und Einkaufszentren.",
        en: "Payment is in Iraqi dinar (IQD); US dollars are widely accepted. Cash is king — credit cards only work in major hotels and malls.",
        ar: "العملة هي الدينار العراقي، ويُقبل الدولار الأمريكي في أماكن كثيرة. النقد هو الأساس، أما البطاقات فتعمل فقط في الفنادق والمولات الكبرى."
      }
    },
    {
      icon: "✈️", arName: "التأشيرة",
      name: { de: "Visum", en: "Visa", ar: "التأشيرة" },
      text: {
        de: "Bürger vieler Länder – darunter Deutschland, Österreich und die Schweiz – erhalten das Visum bei Ankunft an den internationalen Flughäfen (Visa on Arrival). Aktuelle Bestimmungen vor Reiseantritt prüfen.",
        en: "Citizens of many countries — including the EU, UK and US — can obtain a visa on arrival at international airports. Check the current regulations before travelling.",
        ar: "يحصل مواطنو دول كثيرة على تأشيرة عند الوصول في المطارات الدولية. يُستحسن التحقق من الأنظمة السارية قبل السفر."
      }
    },
    {
      icon: "🗣️", arName: "اللغة",
      name: { de: "Sprache", en: "Language", ar: "اللغة" },
      text: {
        de: "Amtssprachen sind Arabisch und Kurdisch. Der irakische Dialekt hat eigene Perlen wie „Aku maku?“ („Was gibt's?“). In den Städten kommt man mit Englisch gut zurecht – ein paar arabische Worte öffnen aber jedes Herz.",
        en: "Arabic and Kurdish are the official languages. The Iraqi dialect has gems like 'Aku maku?' ('What's up?'). English works well in cities — but a few Arabic words open every heart.",
        ar: "العربية والكردية هما اللغتان الرسميتان، وللهجة العراقية دررها مثل «أكو ماكو؟». الإنجليزية مفهومة في المدن، لكن كلمات عربية قليلة تفتح كل القلوب."
      }
    },
    {
      icon: "🤝", arName: "آداب التعامل",
      name: { de: "Etikette", en: "Etiquette", ar: "آداب التعامل" },
      text: {
        de: "Mit rechts grüßen, essen und übergeben; Schuhe vor Moscheen und Wohnungen ausziehen; Menschen vor dem Fotografieren fragen. Und: Einen angebotenen Chai lehnt man nie ab – höchstens beim dritten Glas.",
        en: "Greet, eat and hand things over with the right hand; remove shoes before mosques and homes; ask before photographing people. And never refuse an offered chai — the third glass at the earliest.",
        ar: "السلام والأكل والمناولة باليد اليمنى، وتُخلع الأحذية قبل المساجد والبيوت، ويُستأذن الناس قبل تصويرهم. ولا يُرفض استكان الشاي أبدًا — إلا بعد الثالث ربما."
      }
    },
    {
      icon: "🚕", arName: "الوصول والتنقل",
      name: { de: "Anreise & Verkehr", en: "Getting there & around", ar: "الوصول والتنقل" },
      text: {
        de: "Internationale Flughäfen: Bagdad, Erbil, Basra, Nadschaf und Sulaimaniyya. Vor Ort fährt man mit Taxis oder Apps wie Careem und Baly; zwischen den Städten verkehren Fernbusse und Sammeltaxis.",
        en: "International airports: Baghdad, Erbil, Basra, Najaf and Sulaymaniyah. Locally, people use taxis or apps like Careem and Baly; intercity travel runs on coaches and shared taxis.",
        ar: "المطارات الدولية: بغداد وأربيل والبصرة والنجف والسليمانية. داخل المدن تُستخدم سيارات الأجرة وتطبيقات مثل كريم وبلي، وبين المدن حافلات وسيارات مشتركة."
      }
    }
  ];

  const PHRASES = [
    { ar: "السلام عليكم", tr: "as-salāmu ʿalaykum", de: "Friede sei mit dir (Hallo)", en: "Peace be upon you (hello)" },
    { ar: "شلونك؟", tr: "shlōnak? / shlōnich?", de: "Wie geht's dir?", en: "How are you?" },
    { ar: "زين، الحمد لله", tr: "zēn, il-ḥamdillāh", de: "Gut, Gott sei Dank", en: "Fine, thank God" },
    { ar: "شكراً", tr: "shukran", de: "Danke", en: "Thank you" },
    { ar: "أكو / ماكو", tr: "aku / māku", de: "Es gibt / es gibt nicht", en: "There is / there isn't" },
    { ar: "شگد؟", tr: "shgad?", de: "Wie viel (kostet das)?", en: "How much (is it)?" },
    { ar: "تدلّل", tr: "tdallal", de: "Gern geschehen („Befiehl nur!“)", en: "You're welcome ('at your service')" },
    { ar: "بالعافية", tr: "bil-ʿāfya", de: "Guten Appetit!", en: "Enjoy your meal!" }
  ];

  /* ================= Kunst-Zuordnung (assets/art.js) ================= */
  const ART = window.ART || { dish: {}, city: {}, icon: {} };
  const DISH_ART = ["masgouf", "dolma", "kubba", "quzi", "biryani", "tashreeb", "samoon", "kahi", "kleicha", "chai"];
  const CITY_ART = ["baghdad", "babylon", "erbil", "ur", "samarra", "mosul", "basra", "najaf", "marsh"];
  const CULTURE_ART = ["maqam", "oud", "poetry", "calligraphy", "hospitality", "kurdish", "crafts", "football"];
  const TRAD_ART = ["ramadan", "eid", "newroz", "arbaeen", "wedding", "tigris"];
  const TRAVEL_ART = ["season", "currency", "visa", "language", "etiquette", "transport"];

  /* ================= Helpers ================= */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lang = localStorage.getItem("iraq-lang");
  if (lang !== "ar" && lang !== "en" && lang !== "de") lang = "de";

  const LOCALES = { de: "de-DE", en: "en-US", ar: "ar-IQ" };
  const fmt = (n) => new Intl.NumberFormat(LOCALES[lang]).format(n);
  const pick = (v) => (typeof v === "object" && v !== null ? v[lang] : v);

  function deepGet(obj, path) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ================= Rendering ================= */
  function renderStatic() {
    $$("[data-i18n]").forEach((el) => {
      const val = deepGet(T[lang], el.getAttribute("data-i18n"));
      if (val !== undefined) el.textContent = val;
    });
    document.title = T[lang].title;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$(".lang-switch button").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  }

  function renderStats() {
    $("#statsGrid").innerHTML = STATS.map((s, i) => `
      <div class="stat reveal" style="transition-delay:${i * 70}ms">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-value"><span class="count" data-value="${s.value}">0</span><small>${esc(pick(s.suffix))}</small></div>
        <div class="stat-label">${esc(pick(s.label))}</div>
      </div>`).join("");
  }

  function renderTimeline() {
    $("#timeline").innerHTML = TIMELINE.map((t, i) => `
      <div class="t-item reveal" style="transition-delay:${(i % 2) * 90}ms">
        <div class="t-card">
          <span class="t-year">${esc(pick(t.year))}</span>
          <h3>${esc(pick(t.title))}</h3>
          <p>${esc(pick(t.text))}</p>
        </div>
      </div>`).join("");
  }

  function infoCard(artKeys) {
    return (item, i) => {
      const art = ART.icon[artKeys[i]];
      return `
      <article class="info-card reveal" data-tilt style="transition-delay:${(i % 4) * 70}ms">
        <span class="card-icon">${art || item.icon}</span>
        <h3>${esc(pick(item.name))}</h3>
        <div class="card-arname" dir="rtl" lang="ar">${esc(item.arName)}</div>
        <p>${esc(pick(item.text))}</p>
      </article>`;
    };
  }

  function renderCulture() { $("#cultureGrid").innerHTML = CULTURE.map(infoCard(CULTURE_ART)).join(""); }
  function renderTraditions() { $("#tradGrid").innerHTML = TRADITIONS.map(infoCard(TRAD_ART)).join(""); }
  function renderTravel() { $("#travelGrid").innerHTML = TRAVEL.map(infoCard(TRAVEL_ART)).join(""); }

  function renderDishes() {
    $("#dishGrid").innerHTML = DISHES.map((d, i) => `
      <div class="dish-card reveal" role="button" tabindex="0" style="transition-delay:${(i % 4) * 70}ms"
           aria-label="${esc(pick(d.name))} – ${esc(T[lang].flipHint)}">
        <span class="dish-inner">
          <span class="dish-face dish-front">
            ${ART.dish[DISH_ART[i]]
              ? `<span class="dish-stage">${ART.dish[DISH_ART[i]]}</span>`
              : `<span class="dish-emoji">${d.emoji}</span>`}
            <h3>${esc(pick(d.name))}</h3>
            <span class="card-arname" dir="rtl" lang="ar">${esc(d.arName)}</span>
            <span class="dish-hint">${esc(T[lang].flipHint)}</span>
          </span>
          <span class="dish-face dish-back">
            <span class="dish-badge">${esc(pick(d.badge))}</span>
            <h3>${esc(pick(d.name))}</h3>
            <p>${esc(pick(d.text))}</p>
            <button class="dish-ing-btn" type="button" data-dish="${i}">🧺 ${esc(T[lang].ingBtn)}</button>
          </span>
        </span>
      </div>`).join("");

    $$(".dish-card").forEach((card) => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
      card.addEventListener("keydown", (e) => {
        if (e.target === card && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          card.classList.toggle("flipped");
        }
      });
    });
    $$(".dish-ing-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openIngModal(+btn.dataset.dish);
      });
    });
  }

  /* ================= Zutaten-Explorer (3D-Orbit-Modal) ================= */
  const ingModal = $("#ingModal");

  function openIngModal(i) {
    const d = DISHES[i];
    const key = DISH_ART[i];
    const ings = DISH_INGS[key] || [];
    const n = ings.length;
    $("#ingDish").textContent = pick(d.name);
    // Arabische Unterzeile nur zeigen, wenn sie nicht schon der Titel ist
    $("#ingArName").textContent = pick(d.name) === d.arName ? "" : d.arName;
    $("#ingStage").innerHTML = `
      <div class="ing-center" aria-hidden="true">
        <span class="dish-stage">${ART.dish[key] || ""}</span>
      </div>
      <div class="ing-orbit" style="--n:${n}">
        ${ings.map((k, j) => `
          <div class="orbit-item" style="--i:${j};--d:${(j * 0.55).toFixed(2)}s">
            <div class="ing-chip">
              <span class="ing-icon">${(ART.ing && ART.ing[k]) || "✦"}</span>
              <span class="ing-name">${esc(ING_NAMES[k] ? pick(ING_NAMES[k]) : k)}</span>
            </div>
          </div>`).join("")}
      </div>`;
    ingModal.hidden = false;
    document.body.style.overflow = "hidden";
    $(".ing-close", ingModal).focus();
  }

  function closeIngModal() {
    if (ingModal.hidden) return;
    ingModal.hidden = true;
    document.body.style.overflow = "";
  }

  $(".ing-close", ingModal).addEventListener("click", closeIngModal);
  $(".ing-backdrop", ingModal).addEventListener("click", closeIngModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeIngModal(); });

  function renderCities() {
    $("#cityGrid").innerHTML = CITIES.map((c, i) => `
      <article class="city-card reveal" data-tilt style="transition-delay:${(i % 3) * 80}ms">
        <div class="city-banner">
          ${ART.city[CITY_ART[i]]
            ? `<span class="city-art">${ART.city[CITY_ART[i]]}</span>`
            : `<span class="dish-emoji">${c.emoji}</span>`}
          <span class="city-badge">${esc(pick(c.badge))}</span>
        </div>
        <div class="city-body">
          <h3>${esc(pick(c.name))}</h3>
          <div class="card-arname" dir="rtl" lang="ar">${esc(c.arName)}</div>
          <p>${esc(pick(c.text))}</p>
        </div>
      </article>`).join("");
  }

  function renderPhrases() {
    $("#phraseTable tbody").innerHTML = PHRASES.map((p) => `
      <tr>
        <td class="ph-ar" dir="rtl" lang="ar">${esc(p.ar)}</td>
        <td class="ph-tr">${esc(p.tr)}</td>
        <td class="ph-x">${esc(p.de)}</td>
        <td class="ph-x">${esc(p.en)}</td>
      </tr>`).join("");
  }

  /* ================= Scroll-Reveal + Counter ================= */
  let revealObserver = null;

  function observeReveals() {
    if (revealObserver) revealObserver.disconnect();
    if (reducedMotion || !("IntersectionObserver" in window)) {
      $$(".reveal").forEach((el) => el.classList.add("visible"));
      $$(".count").forEach((el) => { el.textContent = fmt(+el.dataset.value); });
      return;
    }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        $$(".count", entry.target).forEach(animateCount);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach((el) => revealObserver.observe(el));
  }

  function animateCount(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = +el.dataset.value;
    const dur = 1400;
    const start = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ================= 3D-Tilt für Karten ================= */
  const canTilt = !reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function attachTilt() {
    if (!canTilt) return;
    $$("[data-tilt]").forEach((el) => {
      if (el.dataset.tiltBound) return;
      el.dataset.tiltBound = "1";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ================= Sprache umschalten ================= */
  function renderAll() {
    renderStatic();
    renderStats();
    renderTimeline();
    renderCulture();
    renderDishes();
    renderCities();
    renderTraditions();
    renderTravel();
    renderPhrases();
    attachTilt();
    observeReveals();
  }

  $$(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.lang === lang) return;
      lang = btn.dataset.lang;
      localStorage.setItem("iraq-lang", lang);
      closeIngModal();
      renderAll();
    });
  });

  /* ================= Navigation ================= */
  const nav = $("#nav");
  const navLinks = $("#navLinks");
  const burger = $("#burger");
  const progress = $("#progress");
  const toTop = $("#toTop");

  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }));

  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 30);
    toTop.classList.toggle("show", y > 650);
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));

  // Aktiven Nav-Link markieren
  if ("IntersectionObserver" in window) {
    const sections = $$("main section[id]");
    const linkFor = {};
    $$("#navLinks a").forEach((a) => { linkFor[a.getAttribute("href").slice(1)] = a; });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$("#navLinks a").forEach((a) => a.classList.remove("active"));
        const link = linkFor[entry.target.id];
        if (link) link.classList.add("active");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ================= 3D-Szene: Zikkurat von Ur =================
     Eigene Mini-3D-Engine auf Canvas 2D: Boxen aus Vertices/Faces,
     Y-Rotation, Perspektiv-Projektion, Painter-Algorithmus,
     Lambert-Beleuchtung in Gold — plus Sterne und Staubpartikel. */
  (function scene3d() {
    const canvas = $("#scene");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");

    let W = 0, H = 0, dpr = 1, raf = null, visible = true;

    // --- Geometrie: gestufte Zikkurat + Tempel + Freitreppe ---
    const boxes = [];
    (function build() {
      const tiers = [
        { w: 4.0, h: 0.52, d: 3.1 },
        { w: 3.1, h: 0.46, d: 2.4 },
        { w: 2.3, h: 0.42, d: 1.75 },
        { w: 1.55, h: 0.4, d: 1.15 }
      ];
      let y = 0;
      tiers.forEach((t) => {
        boxes.push({ x: 0, y: y + t.h / 2, z: 0, w: t.w, h: t.h, d: t.d });
        y += t.h;
      });
      boxes.push({ x: 0, y: y + 0.29, z: 0, w: 0.85, h: 0.58, d: 0.7 }); // Tempel
      // Freitreppe: schmale Vorbauten vor jeder Stufe
      let sy = 0;
      tiers.forEach((t) => {
        boxes.push({ x: 0, y: sy + t.h / 2, z: t.d / 2 + 0.21, w: 0.55, h: t.h, d: 0.42 });
        sy += t.h;
      });
    })();

    // Vertices/Faces einer Box (zentriert auf x/y/z)
    const FACES = [
      [0, 1, 2, 3], // oben
      [4, 5, 6, 7], // unten
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7]
    ];
    function boxVerts(b) {
      const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
      const y0 = b.y + b.h / 2, y1 = b.y - b.h / 2;
      const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
      return [
        [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
        [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]
      ];
    }

    // --- Sterne & Staub ---
    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random(), y: Math.random() * 0.62,
      r: 0.3 + Math.random() * 1.25, p: Math.random() * Math.PI * 2, s: 0.4 + Math.random() * 1.1
    }));
    const dust = Array.from({ length: 42 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 2, v: 0.00025 + Math.random() * 0.0006, w: Math.random() * Math.PI * 2
    }));

    const LIGHT = (function () {
      const l = [-0.45, 0.85, -0.5];
      const n = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / n, l[1] / n, l[2] / n];
    })();

    const PITCH = 0.44;
    const CAM = 9;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function project(v, yaw) {
      // rotateY(yaw) → rotateX(PITCH) → Perspektive
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cx = Math.cos(PITCH), sx = Math.sin(PITCH);
      let x = v[0] * cy + v[2] * sy;
      let z = -v[0] * sy + v[2] * cy;
      let y = v[1] * cx - z * sx;
      z = v[1] * sx + z * cx;
      const persp = CAM / (CAM + z);
      const unit = Math.min(W * 0.095, H * 0.13);
      return {
        x: W / 2 + x * persp * unit,
        y: H * 0.76 - y * persp * unit,
        z: z, persp: persp
      };
    }

    function rotNormal(n, yaw) {
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cx = Math.cos(PITCH), sx = Math.sin(PITCH);
      let x = n[0] * cy + n[2] * sy;
      let z = -n[0] * sy + n[2] * cy;
      let y = n[1] * cx - z * sx;
      z = n[1] * sx + z * cx;
      return [x, y, z];
    }

    function faceNormal(a, b, c) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      return [n[0] / len, n[1] / len, n[2] / len];
    }

    function goldShade(diff) {
      // Lambert-Mischung zwischen dunklem Bronze und hellem Gold
      const t = 0.22 + 0.78 * diff;
      const r = Math.round(72 + (246 - 72) * t);
      const g = Math.round(52 + (216 - 52) * t);
      const b = Math.round(18 + (150 - 18) * t);
      return "rgb(" + r + "," + g + "," + b + ")";
    }

    function draw(time) {
      ctx.clearRect(0, 0, W, H);
      const t = time * 0.001;
      const yaw = t * 0.22;

      // Sterne
      for (const s of stars) {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * s.s + s.p));
        ctx.globalAlpha = tw * 0.85;
        ctx.fillStyle = "#dfe6ff";
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Glutschein hinter der Zikkurat
      const gx = W / 2, gy = H * 0.68;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(W, H) * 0.42);
      glow.addColorStop(0, "rgba(212,169,78,0.20)");
      glow.addColorStop(0.6, "rgba(212,169,78,0.06)");
      glow.addColorStop(1, "rgba(212,169,78,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Boden-Ellipse
      const ground = ctx.createRadialGradient(gx, H * 0.82, 0, gx, H * 0.82, W * 0.32);
      ground.addColorStop(0, "rgba(212,169,78,0.10)");
      ground.addColorStop(1, "rgba(212,169,78,0)");
      ctx.save();
      ctx.translate(gx, H * 0.82);
      ctx.scale(1, 0.28);
      ctx.translate(-gx, -H * 0.82);
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Zikkurat: alle Faces sammeln, nach Tiefe sortieren, zeichnen
      const faces = [];
      for (const b of boxes) {
        const verts = boxVerts(b);
        const proj = verts.map((v) => project(v, yaw));
        for (const idx of FACES) {
          const n = rotNormal(faceNormal(verts[idx[0]], verts[idx[1]], verts[idx[2]]), yaw);
          if (n[2] > 0.02) continue; // Rückseiten überspringen
          const diff = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
          const depth = (proj[idx[0]].z + proj[idx[1]].z + proj[idx[2]].z + proj[idx[3]].z) / 4;
          faces.push({ pts: idx.map((i) => proj[i]), depth: depth, diff: diff });
        }
      }
      faces.sort((a, b) => b.depth - a.depth);
      for (const f of faces) {
        ctx.beginPath();
        ctx.moveTo(f.pts[0].x, f.pts[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
        ctx.closePath();
        ctx.fillStyle = goldShade(f.diff);
        ctx.fill();
        ctx.strokeStyle = "rgba(246,226,174,0.35)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Goldstaub
      for (const p of dust) {
        p.y -= p.v;
        p.w += 0.012;
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const px = (p.x + Math.sin(p.w) * 0.012) * W;
        const alpha = 0.12 + 0.2 * Math.abs(Math.sin(p.w * 0.7));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#e8c877";
        ctx.beginPath();
        ctx.arc(px, p.y * H, p.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function loop(time) {
      draw(time);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (raf === null && visible && !reducedMotion) raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }

    window.addEventListener("resize", () => { resize(); if (reducedMotion) draw(4000); });
    document.addEventListener("visibilitychange", () => {
      document.hidden ? stop() : start();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }).observe(canvas);
    }

    resize();
    if (reducedMotion) draw(4000); else start();
  })();

  /* ================= Los geht's ================= */
  renderAll();
})();
