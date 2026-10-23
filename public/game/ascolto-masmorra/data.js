/*
  Ascolto Masmorra: DADOS DO JOGO
  ---------------------------------------------------------------
  Este arquivo só tem dados (sem lógica e sem tela). Tudo aqui é compatível
  com JSON, então dá para virar tabelas do Supabase quase sem mexer:

    items          -> tabela "items" (id, emoji, rarity, pt) + "item_names" (item_id, lang, article, word, gender, kanji, kana, romaji)
    monsters       -> criaturas: só nome em português (nunca ensinam palavra do idioma)
    gear           -> 7 peças de equipamento (nome em português; só a espada tem palavra no idioma)
    dungeon.rooms  -> layout de 10 salas, igual em todas as regiões (role = minion | elite | boss)
    course         -> O CURSO: semanas (região, música, monstros, lore) e a lista de palavras
                      de cada semana com a origem (caça-palavras, cards, letra) e o dia em que libera
    story          -> abertura e texto de derrota (a lore de cada semana fica em course.weeks[].beats)
    config         -> constantes do jogo e do agendador de repetição (srs)

  REGRA PRINCIPAL: o jogo só usa palavras já liberadas pelo roteiro (semana atual + dia).
  Palavras ainda não liberadas nunca aparecem em desafio, loot, opções, inventário ou lore.
  O vocabulário fixo (course.core.words) é ensinado no começo e fica sempre liberado.

  Para adicionar palavras, acrescente objetos em "items" e liste-os em course.weeks[].words.
  Gênero: "m" masculino, "f" feminino, "n" neutro (só alemão).
  Italiano: article pode ser "il", "lo", "la" ou "l'" (sem espaço depois do apóstrofo).
  Japonês: kanji pode ser null quando a palavra se escreve só em kana (ex.: パン).

  Lore: em cada beat, as palavras marcadas como {o|dragao} aparecem em português até o dia
  em que a palavra é liberada; depois viram a palavra no idioma estudado.
*/
var ASCOLTO_DATA = {
 "version": 6,
 "art": {
  "hero": {
   "idle": "assets/hero/normal.png",
   "attack": "assets/hero/atacando.png",
   "hurt": "assets/hero/surpreso.png",
   "win": "assets/hero/pulando.png",
   "run": "assets/hero/correndo.png",
   "lose": "assets/hero/derrota.png"
  },
  "heroStages": [
   "assets/hero/stage0.png",
   "assets/hero/stage1.png",
   "assets/hero/stage2.png",
   "assets/hero/stage3.png",
   "assets/hero/stage4.png",
   "assets/hero/stage5.png",
   "assets/hero/stage6.png",
   "assets/hero/stage7.png"
  ],
  "mascot": {
   "idle": "assets/hero/ascolto-idle.png",
   "talk": "assets/hero/ascolto-falando.png",
   "point": "assets/hero/ascolto-apontando.png",
   "happy": "assets/hero/ascolto-feliz.png",
   "worried": "assets/hero/ascolto-preocupada.png",
   "sleep": "assets/hero/ascolto-dormindo.png"
  },
  "narrator": "assets/hero/ascolto-falando.png",
  "rest": "assets/item/fogueira.png",
  "chests": [
   "assets/item/bau.png",
   "assets/item/bau-incomum.png",
   "assets/item/bau-raro.png"
  ],
  "fx": {
   "luz": "assets/fx/luz.png",
   "cura": "assets/fx/cura.png"
  },
  "dungeon": "assets/bg/dungeon.jpg"
 },
 "config": {
  "maxHp": 6,
  "monsterDmg": 1,
  "trapDmg": 1,
  "restHeal": 2,
  "challengeWeights": {
   "meaning": 5,
   "listen": 4,
   "speak": 2
  },
  "boss": {
   "hit": 60,
   "crit": 85
  },
  "loot": {
   "0": {
    "common": 70,
    "uncommon": 25,
    "rare": 5
   },
   "1": {
    "common": 45,
    "uncommon": 35,
    "rare": 17,
    "epic": 3
   },
   "2": {
    "common": 20,
    "uncommon": 35,
    "rare": 30,
    "epic": 13,
    "legendary": 2
   },
   "3": {
    "uncommon": 20,
    "rare": 40,
    "epic": 30,
    "legendary": 10
   },
   "4": {
    "rare": 20,
    "epic": 45,
    "legendary": 35
   }
  },
  "srs": {
   "learnSteps": [
    1,
    10
   ],
   "lapseSteps": [
    10
   ],
   "gradIvl": 1,
   "easyIvl": 4,
   "startEase": 2.5,
   "minEase": 1.3,
   "easyBonus": 1.3,
   "hardFactor": 1.2,
   "maxIvl": 365,
   "lapseNewIvl": 0,
   "aheadMin": 10,
   "newPerDay": 20,
   "reviewShare": 0.6,
   "timing": {
    "easyMeaning": 3,
    "hardMeaning": 15,
    "easyListen": 5,
    "hardListen": 20
   }
  }
 },
 "languages": [
  {
   "id": "it",
   "label": "Italiano",
   "short": "IT",
   "tag": "it-IT"
  },
  {
   "id": "de",
   "label": "Deutsch",
   "short": "DE",
   "tag": "de-DE"
  },
  {
   "id": "ja",
   "label": "日本語",
   "short": "JA",
   "tag": "ja-JP"
  }
 ],
 "rarities": [
  {
   "id": "common",
   "label": "Comum",
   "rank": 1
  },
  {
   "id": "uncommon",
   "label": "Incomum",
   "rank": 2
  },
  {
   "id": "rare",
   "label": "Raro",
   "rank": 3
  },
  {
   "id": "epic",
   "label": "Épico",
   "rank": 4
  },
  {
   "id": "legendary",
   "label": "Lendário",
   "rank": 5
  }
 ],
 "items": [
  {
   "id": "maca",
   "img": "assets/item/maca.png",
   "emoji": "🍎",
   "rarity": "common",
   "pt": "maçã",
   "names": {
    "it": {
     "article": "la",
     "word": "mela",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Apfel",
     "gender": "m"
    },
    "ja": {
     "kanji": "林檎",
     "kana": "りんご",
     "romaji": "ringo"
    }
   }
  },
  {
   "id": "pao",
   "img": "assets/item/pao.png",
   "emoji": "🍞",
   "rarity": "common",
   "pt": "pão",
   "names": {
    "it": {
     "article": "il",
     "word": "pane",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Brot",
     "gender": "n"
    },
    "ja": {
     "kanji": null,
     "kana": "パン",
     "romaji": "pan"
    }
   }
  },
  {
   "id": "agua",
   "img": "assets/item/agua.png",
   "emoji": "💧",
   "rarity": "common",
   "pt": "água",
   "names": {
    "it": {
     "article": "l'",
     "word": "acqua",
     "gender": "f"
    },
    "de": {
     "article": "das",
     "word": "Wasser",
     "gender": "n"
    },
    "ja": {
     "kanji": "水",
     "kana": "みず",
     "romaji": "mizu"
    }
   }
  },
  {
   "id": "chave",
   "img": "assets/item/chave.png",
   "emoji": "🗝️",
   "rarity": "common",
   "pt": "chave",
   "names": {
    "it": {
     "article": "la",
     "word": "chiave",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Schlüssel",
     "gender": "m"
    },
    "ja": {
     "kanji": "鍵",
     "kana": "かぎ",
     "romaji": "kagi"
    }
   }
  },
  {
   "id": "livro",
   "img": "assets/item/livro.png",
   "emoji": "📖",
   "rarity": "common",
   "pt": "livro",
   "names": {
    "it": {
     "article": "il",
     "word": "libro",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Buch",
     "gender": "n"
    },
    "ja": {
     "kanji": "本",
     "kana": "ほん",
     "romaji": "hon"
    }
   }
  },
  {
   "id": "vela",
   "img": "assets/item/vela.png",
   "emoji": "🕯️",
   "rarity": "common",
   "pt": "vela",
   "names": {
    "it": {
     "article": "la",
     "word": "candela",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Kerze",
     "gender": "f"
    },
    "ja": {
     "kanji": "蝋燭",
     "kana": "ろうそく",
     "romaji": "rousoku"
    }
   }
  },
  {
   "id": "queijo",
   "img": "assets/item/queijo.png",
   "emoji": "🧀",
   "rarity": "common",
   "pt": "queijo",
   "names": {
    "it": {
     "article": "il",
     "word": "formaggio",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Käse",
     "gender": "m"
    },
    "ja": {
     "kanji": null,
     "kana": "チーズ",
     "romaji": "chiizu"
    }
   }
  },
  {
   "id": "cogumelo",
   "img": "assets/item/cogumelo.png",
   "emoji": "🍄",
   "rarity": "common",
   "pt": "cogumelo",
   "names": {
    "it": {
     "article": "il",
     "word": "fungo",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Pilz",
     "gender": "m"
    },
    "ja": {
     "kanji": "茸",
     "kana": "きのこ",
     "romaji": "kinoko"
    }
   }
  },
  {
   "id": "osso",
   "img": "assets/item/osso.png",
   "emoji": "🦴",
   "rarity": "common",
   "pt": "osso",
   "names": {
    "it": {
     "article": "l'",
     "word": "osso",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Knochen",
     "gender": "m"
    },
    "ja": {
     "kanji": "骨",
     "kana": "ほね",
     "romaji": "hone"
    }
   }
  },
  {
   "id": "pedra",
   "img": "assets/item/pedra.png",
   "emoji": "🪨",
   "rarity": "common",
   "pt": "pedra",
   "names": {
    "it": {
     "article": "la",
     "word": "pietra",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Stein",
     "gender": "m"
    },
    "ja": {
     "kanji": "石",
     "kana": "いし",
     "romaji": "ishi"
    }
   }
  },
  {
   "id": "moeda",
   "img": "assets/item/moeda.png",
   "emoji": "🪙",
   "rarity": "common",
   "pt": "moeda",
   "names": {
    "it": {
     "article": "la",
     "word": "moneta",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Münze",
     "gender": "f"
    },
    "ja": {
     "kanji": "硬貨",
     "kana": "こうか",
     "romaji": "kouka"
    }
   }
  },
  {
   "id": "fogo",
   "img": "assets/item/fogo.png",
   "emoji": "🔥",
   "rarity": "common",
   "pt": "fogo",
   "names": {
    "it": {
     "article": "il",
     "word": "fuoco",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Feuer",
     "gender": "n"
    },
    "ja": {
     "kanji": "火",
     "kana": "ひ",
     "romaji": "hi"
    }
   }
  },
  {
   "id": "capacete",
   "img": "assets/item/elmo.png",
   "emoji": "🪖",
   "rarity": "common",
   "pt": "capacete",
   "names": {
    "it": {
     "article": "l'",
     "word": "elmo",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Helm",
     "gender": "m"
    },
    "ja": {
     "kanji": "兜",
     "kana": "かぶと",
     "romaji": "kabuto"
    }
   }
  },
  {
   "id": "bau",
   "img": "assets/item/bau.png",
   "emoji": "🧰",
   "rarity": "common",
   "pt": "baú",
   "names": {
    "it": {
     "article": "il",
     "word": "baule",
     "gender": "m"
    },
    "de": {
     "article": "die",
     "word": "Truhe",
     "gender": "f"
    },
    "ja": {
     "kanji": "宝箱",
     "kana": "たからばこ",
     "romaji": "takarabako"
    }
   }
  },
  {
   "id": "mochila",
   "img": "assets/item/mochila.png",
   "emoji": "🎒",
   "rarity": "common",
   "pt": "mochila",
   "names": {
    "it": {
     "article": "lo",
     "word": "zaino",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Rucksack",
     "gender": "m"
    },
    "ja": {
     "kanji": null,
     "kana": "リュック",
     "romaji": "ryukku"
    }
   }
  },
  {
   "id": "luva",
   "img": "assets/item/luvas.png",
   "emoji": "🧤",
   "rarity": "common",
   "pt": "luva",
   "names": {
    "it": {
     "article": "il",
     "word": "guanto",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Handschuh",
     "gender": "m"
    },
    "ja": {
     "kanji": "手袋",
     "kana": "てぶくろ",
     "romaji": "tebukuro"
    }
   }
  },
  {
   "id": "pocao",
   "img": "assets/item/pocao-vida.png",
   "emoji": "🧪",
   "rarity": "uncommon",
   "pt": "poção",
   "names": {
    "it": {
     "article": "la",
     "word": "pozione",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Zaubertrank",
     "gender": "m"
    },
    "ja": {
     "kanji": "魔法薬",
     "kana": "まほうやく",
     "romaji": "mahouyaku"
    }
   }
  },
  {
   "id": "arco",
   "img": "assets/item/arco.png",
   "emoji": "🏹",
   "rarity": "uncommon",
   "pt": "arco",
   "names": {
    "it": {
     "article": "l'",
     "word": "arco",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Bogen",
     "gender": "m"
    },
    "ja": {
     "kanji": "弓",
     "kana": "ゆみ",
     "romaji": "yumi"
    }
   }
  },
  {
   "id": "mapa",
   "img": "assets/item/mapa.png",
   "emoji": "🗺️",
   "rarity": "uncommon",
   "pt": "mapa",
   "names": {
    "it": {
     "article": "la",
     "word": "mappa",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Karte",
     "gender": "f"
    },
    "ja": {
     "kanji": "地図",
     "kana": "ちず",
     "romaji": "chizu"
    }
   }
  },
  {
   "id": "lanterna",
   "img": "assets/item/lanterna.png",
   "emoji": "🏮",
   "rarity": "uncommon",
   "pt": "lanterna",
   "names": {
    "it": {
     "article": "la",
     "word": "lanterna",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Laterne",
     "gender": "f"
    },
    "ja": {
     "kanji": "提灯",
     "kana": "ちょうちん",
     "romaji": "chouchin"
    }
   }
  },
  {
   "id": "corda",
   "img": "assets/item/corda.png",
   "emoji": "🪢",
   "rarity": "uncommon",
   "pt": "corda",
   "names": {
    "it": {
     "article": "la",
     "word": "corda",
     "gender": "f"
    },
    "de": {
     "article": "das",
     "word": "Seil",
     "gender": "n"
    },
    "ja": {
     "kanji": "縄",
     "kana": "なわ",
     "romaji": "nawa"
    }
   }
  },
  {
   "id": "martelo",
   "img": "assets/item/martelo.png",
   "emoji": "🔨",
   "rarity": "uncommon",
   "pt": "martelo",
   "names": {
    "it": {
     "article": "il",
     "word": "martello",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Hammer",
     "gender": "m"
    },
    "ja": {
     "kanji": "金槌",
     "kana": "かなづち",
     "romaji": "kanazuchi"
    }
   }
  },
  {
   "id": "bota",
   "img": "assets/item/botas.png",
   "emoji": "🥾",
   "rarity": "uncommon",
   "pt": "bota",
   "names": {
    "it": {
     "article": "lo",
     "word": "stivale",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Stiefel",
     "gender": "m"
    },
    "ja": {
     "kanji": null,
     "kana": "ブーツ",
     "romaji": "buutsu"
    }
   }
  },
  {
   "id": "capa",
   "img": "assets/item/capa.png",
   "emoji": "🧥",
   "rarity": "uncommon",
   "pt": "capa",
   "names": {
    "it": {
     "article": "il",
     "word": "mantello",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Umhang",
     "gender": "m"
    },
    "ja": {
     "kanji": null,
     "kana": "マント",
     "romaji": "manto"
    }
   }
  },
  {
   "id": "anel",
   "img": "assets/item/anel.png",
   "emoji": "💍",
   "rarity": "rare",
   "pt": "anel",
   "names": {
    "it": {
     "article": "l'",
     "word": "anello",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Ring",
     "gender": "m"
    },
    "ja": {
     "kanji": "指輪",
     "kana": "ゆびわ",
     "romaji": "yubiwa"
    }
   }
  },
  {
   "id": "coroa",
   "img": "assets/item/coroa.png",
   "emoji": "👑",
   "rarity": "rare",
   "pt": "coroa",
   "names": {
    "it": {
     "article": "la",
     "word": "corona",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Krone",
     "gender": "f"
    },
    "ja": {
     "kanji": "王冠",
     "kana": "おうかん",
     "romaji": "oukan"
    }
   }
  },
  {
   "id": "gema",
   "img": "assets/item/gema.png",
   "emoji": "💎",
   "rarity": "rare",
   "pt": "gema",
   "names": {
    "it": {
     "article": "la",
     "word": "gemma",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Edelstein",
     "gender": "m"
    },
    "ja": {
     "kanji": "宝石",
     "kana": "ほうせき",
     "romaji": "houseki"
    }
   }
  },
  {
   "id": "pergaminho",
   "img": "assets/item/pergaminho.png",
   "emoji": "📜",
   "rarity": "rare",
   "pt": "pergaminho",
   "names": {
    "it": {
     "article": "la",
     "word": "pergamena",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Schriftrolle",
     "gender": "f"
    },
    "ja": {
     "kanji": "巻物",
     "kana": "まきもの",
     "romaji": "makimono"
    }
   }
  },
  {
   "id": "lobo",
   "img": "assets/mon/lobo.png",
   "emoji": "🐺",
   "rarity": "rare",
   "pt": "lobo",
   "names": {
    "it": {
     "article": "il",
     "word": "lupo",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Wolf",
     "gender": "m"
    },
    "ja": {
     "kanji": "狼",
     "kana": "おおかみ",
     "romaji": "ookami"
    }
   }
  },
  {
   "id": "coruja",
   "img": "assets/item/coruja.png",
   "emoji": "🦉",
   "rarity": "rare",
   "pt": "coruja",
   "names": {
    "it": {
     "article": "il",
     "word": "gufo",
     "gender": "m"
    },
    "de": {
     "article": "die",
     "word": "Eule",
     "gender": "f"
    },
    "ja": {
     "kanji": "梟",
     "kana": "ふくろう",
     "romaji": "fukurou"
    }
   }
  },
  {
   "id": "estrela",
   "img": "assets/item/luz.png",
   "emoji": "⭐",
   "rarity": "rare",
   "pt": "estrela",
   "names": {
    "it": {
     "article": "la",
     "word": "stella",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Stern",
     "gender": "m"
    },
    "ja": {
     "kanji": "星",
     "kana": "ほし",
     "romaji": "hoshi"
    }
   }
  },
  {
   "id": "lua",
   "img": "assets/item/lua.png",
   "emoji": "🌙",
   "rarity": "rare",
   "pt": "lua",
   "names": {
    "it": {
     "article": "la",
     "word": "luna",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Mond",
     "gender": "m"
    },
    "ja": {
     "kanji": "月",
     "kana": "つき",
     "romaji": "tsuki"
    }
   }
  },
  {
   "id": "armadura",
   "img": "assets/item/armadura.png",
   "emoji": "🥋",
   "rarity": "rare",
   "pt": "armadura",
   "names": {
    "it": {
     "article": "l'",
     "word": "armatura",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Rüstung",
     "gender": "f"
    },
    "ja": {
     "kanji": "鎧",
     "kana": "よろい",
     "romaji": "yoroi"
    }
   }
  },
  {
   "id": "escudo",
   "img": "assets/item/escudo.png",
   "emoji": "🛡️",
   "rarity": "epic",
   "pt": "escudo",
   "names": {
    "it": {
     "article": "lo",
     "word": "scudo",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Schild",
     "gender": "m"
    },
    "ja": {
     "kanji": "盾",
     "kana": "たて",
     "romaji": "tate"
    }
   }
  },
  {
   "id": "fenix",
   "img": "assets/item/fenix.png",
   "emoji": "🐦‍🔥",
   "rarity": "epic",
   "pt": "fênix",
   "names": {
    "it": {
     "article": "la",
     "word": "fenice",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Phönix",
     "gender": "m"
    },
    "ja": {
     "kanji": "不死鳥",
     "kana": "ふしちょう",
     "romaji": "fushichou"
    }
   }
  },
  {
   "id": "unicornio",
   "img": "assets/item/unicornio.png",
   "emoji": "🦄",
   "rarity": "epic",
   "pt": "unicórnio",
   "names": {
    "it": {
     "article": "l'",
     "word": "unicorno",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Einhorn",
     "gender": "n"
    },
    "ja": {
     "kanji": "一角獣",
     "kana": "いっかくじゅう",
     "romaji": "ikkakujuu"
    }
   }
  },
  {
   "id": "fantasma",
   "img": "assets/mon/fantasma.png",
   "emoji": "👻",
   "rarity": "epic",
   "pt": "fantasma",
   "names": {
    "it": {
     "article": "il",
     "word": "fantasma",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Gespenst",
     "gender": "n"
    },
    "ja": {
     "kanji": "幽霊",
     "kana": "ゆうれい",
     "romaji": "yuurei"
    }
   }
  },
  {
   "id": "raio",
   "img": "assets/item/raio.png",
   "emoji": "⚡",
   "rarity": "epic",
   "pt": "raio",
   "names": {
    "it": {
     "article": "il",
     "word": "fulmine",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Blitz",
     "gender": "m"
    },
    "ja": {
     "kanji": "雷",
     "kana": "かみなり",
     "romaji": "kaminari"
    }
   }
  },
  {
   "id": "mago",
   "img": "assets/mon/mago.png",
   "emoji": "🧙",
   "rarity": "epic",
   "pt": "mago",
   "names": {
    "it": {
     "article": "il",
     "word": "mago",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Zauberer",
     "gender": "m"
    },
    "ja": {
     "kanji": "魔法使い",
     "kana": "まほうつかい",
     "romaji": "mahoutsukai"
    }
   }
  },
  {
   "id": "espada",
   "img": "assets/item/espada.png",
   "emoji": "⚔️",
   "rarity": "legendary",
   "pt": "espada",
   "names": {
    "it": {
     "article": "la",
     "word": "spada",
     "gender": "f"
    },
    "de": {
     "article": "das",
     "word": "Schwert",
     "gender": "n"
    },
    "ja": {
     "kanji": "剣",
     "kana": "けん",
     "romaji": "ken"
    }
   }
  },
  {
   "id": "dragao",
   "img": "assets/item/dragao.png",
   "emoji": "🐉",
   "rarity": "legendary",
   "pt": "dragão",
   "names": {
    "it": {
     "article": "il",
     "word": "drago",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Drache",
     "gender": "m"
    },
    "ja": {
     "kanji": "竜",
     "kana": "りゅう",
     "romaji": "ryuu"
    }
   }
  },
  {
   "id": "tesouro",
   "img": "assets/item/tesouro.png",
   "emoji": "💰",
   "rarity": "legendary",
   "pt": "tesouro",
   "names": {
    "it": {
     "article": "il",
     "word": "tesoro",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Schatz",
     "gender": "m"
    },
    "ja": {
     "kanji": "宝",
     "kana": "たから",
     "romaji": "takara"
    }
   }
  },
  {
   "id": "castelo",
   "img": "assets/item/castelo.png",
   "emoji": "🏰",
   "rarity": "legendary",
   "pt": "castelo",
   "names": {
    "it": {
     "article": "il",
     "word": "castello",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Schloss",
     "gender": "n"
    },
    "ja": {
     "kanji": "城",
     "kana": "しろ",
     "romaji": "shiro"
    }
   }
  },
  {
   "id": "sol",
   "img": "assets/item/sol.png",
   "emoji": "☀️",
   "rarity": "legendary",
   "pt": "sol",
   "names": {
    "it": {
     "article": "il",
     "word": "sole",
     "gender": "m"
    },
    "de": {
     "article": "die",
     "word": "Sonne",
     "gender": "f"
    },
    "ja": {
     "kanji": "太陽",
     "kana": "たいよう",
     "romaji": "taiyou"
    }
   }
  },
  {
   "id": "casa",
   "img": "assets/item/casa.png",
   "emoji": "🏠",
   "rarity": "common",
   "pt": "casa",
   "names": {
    "it": {
     "article": "la",
     "word": "casa",
     "gender": "f"
    },
    "de": {
     "article": "das",
     "word": "Haus",
     "gender": "n"
    },
    "ja": {
     "kanji": "家",
     "kana": "いえ",
     "romaji": "ie"
    }
   }
  },
  {
   "id": "rua",
   "img": "assets/item/rua.png",
   "emoji": "🛣️",
   "rarity": "common",
   "pt": "rua",
   "names": {
    "it": {
     "article": "la",
     "word": "strada",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Straße",
     "gender": "f"
    },
    "ja": {
     "kanji": "道",
     "kana": "みち",
     "romaji": "michi"
    }
   }
  },
  {
   "id": "nuvem",
   "img": "assets/item/nuvem.png",
   "emoji": "☁️",
   "rarity": "common",
   "pt": "nuvem",
   "names": {
    "it": {
     "article": "la",
     "word": "nuvola",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Wolke",
     "gender": "f"
    },
    "ja": {
     "kanji": "雲",
     "kana": "くも",
     "romaji": "kumo"
    }
   }
  },
  {
   "id": "rio",
   "img": "assets/item/rio.png",
   "emoji": "🏞️",
   "rarity": "common",
   "pt": "rio",
   "names": {
    "it": {
     "article": "il",
     "word": "fiume",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Fluss",
     "gender": "m"
    },
    "ja": {
     "kanji": "川",
     "kana": "かわ",
     "romaji": "kawa"
    }
   }
  },
  {
   "id": "onda",
   "img": "assets/item/onda.png",
   "emoji": "🌊",
   "rarity": "uncommon",
   "pt": "onda",
   "names": {
    "it": {
     "article": "l'",
     "word": "onda",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Welle",
     "gender": "f"
    },
    "ja": {
     "kanji": "波",
     "kana": "なみ",
     "romaji": "nami"
    }
   }
  },
  {
   "id": "mae",
   "img": "assets/item/mae.png",
   "emoji": "👩",
   "rarity": "common",
   "pt": "mãe",
   "names": {
    "it": {
     "article": "la",
     "word": "mamma",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Mama",
     "gender": "f"
    },
    "ja": {
     "kanji": "お母さん",
     "kana": "おかあさん",
     "romaji": "okaasan"
    }
   }
  },
  {
   "id": "crianca",
   "img": "assets/item/crianca.png",
   "emoji": "🧒",
   "rarity": "common",
   "pt": "criança",
   "names": {
    "it": {
     "article": "il",
     "word": "bambino",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Kind",
     "gender": "n"
    },
    "ja": {
     "kanji": "子供",
     "kana": "こども",
     "romaji": "kodomo"
    }
   }
  },
  {
   "id": "escola",
   "img": "assets/item/escola.png",
   "emoji": "🏫",
   "rarity": "common",
   "pt": "escola",
   "names": {
    "it": {
     "article": "la",
     "word": "scuola",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Schule",
     "gender": "f"
    },
    "ja": {
     "kanji": "学校",
     "kana": "がっこう",
     "romaji": "gakkou"
    }
   }
  },
  {
   "id": "quarto",
   "img": "assets/item/quarto.png",
   "emoji": "🛏️",
   "rarity": "common",
   "pt": "quarto",
   "names": {
    "it": {
     "article": "la",
     "word": "stanza",
     "gender": "f"
    },
    "de": {
     "article": "das",
     "word": "Zimmer",
     "gender": "n"
    },
    "ja": {
     "kanji": "部屋",
     "kana": "へや",
     "romaji": "heya"
    }
   }
  },
  {
   "id": "olho",
   "img": "assets/item/olho.png",
   "emoji": "👁️",
   "rarity": "common",
   "pt": "olho",
   "names": {
    "it": {
     "article": "l'",
     "word": "occhio",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Auge",
     "gender": "n"
    },
    "ja": {
     "kanji": "目",
     "kana": "め",
     "romaji": "me"
    }
   }
  },
  {
   "id": "espelho",
   "img": "assets/item/espelho.png",
   "emoji": "🪞",
   "rarity": "rare",
   "pt": "espelho",
   "names": {
    "it": {
     "article": "lo",
     "word": "specchio",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Spiegel",
     "gender": "m"
    },
    "ja": {
     "kanji": "鏡",
     "kana": "かがみ",
     "romaji": "kagami"
    }
   }
  },
  {
   "id": "caderno",
   "img": "assets/item/caderno.png",
   "emoji": "📓",
   "rarity": "uncommon",
   "pt": "caderno",
   "names": {
    "it": {
     "article": "il",
     "word": "quaderno",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Heft",
     "gender": "n"
    },
    "ja": {
     "kanji": null,
     "kana": "ノート",
     "romaji": "nooto"
    }
   }
  },
  {
   "id": "aviao",
   "img": "assets/item/aviao.png",
   "emoji": "✈️",
   "rarity": "uncommon",
   "pt": "avião",
   "names": {
    "it": {
     "article": "l'",
     "word": "aereo",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Flugzeug",
     "gender": "n"
    },
    "ja": {
     "kanji": "飛行機",
     "kana": "ひこうき",
     "romaji": "hikouki"
    }
   }
  },
  {
   "id": "ceu",
   "img": "assets/item/ceu.png",
   "emoji": "🌌",
   "rarity": "uncommon",
   "pt": "céu",
   "names": {
    "it": {
     "article": "il",
     "word": "cielo",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Himmel",
     "gender": "m"
    },
    "ja": {
     "kanji": "空",
     "kana": "そら",
     "romaji": "sora"
    }
   }
  },
  {
   "id": "geladeira",
   "img": "assets/item/geladeira.png",
   "emoji": "🧊",
   "rarity": "uncommon",
   "pt": "geladeira",
   "names": {
    "it": {
     "article": "il",
     "word": "frigo",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Kühlschrank",
     "gender": "m"
    },
    "ja": {
     "kanji": "冷蔵庫",
     "kana": "れいぞうこ",
     "romaji": "reizouko"
    }
   }
  },
  {
   "id": "sonho",
   "img": "assets/item/sonho.png",
   "emoji": "💭",
   "rarity": "rare",
   "pt": "sonho",
   "names": {
    "it": {
     "article": "il",
     "word": "sogno",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Traum",
     "gender": "m"
    },
    "ja": {
     "kanji": "夢",
     "kana": "ゆめ",
     "romaji": "yume"
    }
   }
  },
  {
   "id": "amor",
   "img": "assets/item/amor.png",
   "emoji": "❤️",
   "rarity": "epic",
   "pt": "amor",
   "names": {
    "it": {
     "article": "l'",
     "word": "amore",
     "gender": "m"
    },
    "de": {
     "article": "die",
     "word": "Liebe",
     "gender": "f"
    },
    "ja": {
     "kanji": "愛",
     "kana": "あい",
     "romaji": "ai"
    }
   }
  },
  {
   "id": "destino",
   "img": "assets/item/destino.png",
   "emoji": "🔮",
   "rarity": "epic",
   "pt": "destino",
   "names": {
    "it": {
     "article": "il",
     "word": "destino",
     "gender": "m"
    },
    "de": {
     "article": "das",
     "word": "Schicksal",
     "gender": "n"
    },
    "ja": {
     "kanji": "運命",
     "kana": "うんめい",
     "romaji": "unmei"
    }
   }
  },
  {
   "id": "diamante",
   "img": "assets/item/diamante.png",
   "emoji": "💠",
   "rarity": "rare",
   "pt": "diamante",
   "names": {
    "it": {
     "article": "il",
     "word": "diamante",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Diamant",
     "gender": "m"
    },
    "ja": {
     "kanji": null,
     "kana": "ダイヤモンド",
     "romaji": "daiyamondo"
    }
   }
  },
  {
   "id": "chama",
   "img": "assets/item/chama.png",
   "emoji": "🔥",
   "rarity": "rare",
   "pt": "chama",
   "names": {
    "it": {
     "article": "la",
     "word": "fiamma",
     "gender": "f"
    },
    "de": {
     "article": "die",
     "word": "Flamme",
     "gender": "f"
    },
    "ja": {
     "kanji": "炎",
     "kana": "ほのお",
     "romaji": "honoo"
    }
   }
  },
  {
   "id": "luz",
   "img": "assets/item/lampada.png",
   "emoji": "💡",
   "rarity": "uncommon",
   "pt": "luz",
   "names": {
    "it": {
     "article": "la",
     "word": "luce",
     "gender": "f"
    },
    "de": {
     "article": "das",
     "word": "Licht",
     "gender": "n"
    },
    "ja": {
     "kanji": "光",
     "kana": "ひかり",
     "romaji": "hikari"
    }
   }
  },
  {
   "id": "pirata",
   "img": "assets/item/pirata.png",
   "emoji": "🏴‍☠️",
   "rarity": "epic",
   "pt": "pirata",
   "names": {
    "it": {
     "article": "il",
     "word": "pirata",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Pirat",
     "gender": "m"
    },
    "ja": {
     "kanji": "海賊",
     "kana": "かいぞく",
     "romaji": "kaizoku"
    }
   }
  },
  {
   "id": "soldado",
   "img": "assets/item/soldado.png",
   "emoji": "💂",
   "rarity": "rare",
   "pt": "soldado",
   "names": {
    "it": {
     "article": "il",
     "word": "soldato",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Soldat",
     "gender": "m"
    },
    "ja": {
     "kanji": "兵士",
     "kana": "へいし",
     "romaji": "heishi"
    }
   }
  },
  {
   "id": "gigante",
   "img": "assets/item/gigante.png",
   "emoji": "🧌",
   "rarity": "epic",
   "pt": "gigante",
   "names": {
    "it": {
     "article": "il",
     "word": "gigante",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Riese",
     "gender": "m"
    },
    "ja": {
     "kanji": "巨人",
     "kana": "きょじん",
     "romaji": "kyojin"
    }
   }
  },
  {
   "id": "asa",
   "img": "assets/item/asa.png",
   "emoji": "🕊️",
   "rarity": "rare",
   "pt": "asa",
   "names": {
    "it": {
     "article": "l'",
     "word": "ala",
     "gender": "f"
    },
    "de": {
     "article": "der",
     "word": "Flügel",
     "gender": "m"
    },
    "ja": {
     "kanji": "翼",
     "kana": "つばさ",
     "romaji": "tsubasa"
    }
   }
  },
  {
   "id": "respiracao",
   "img": "assets/item/respiracao.png",
   "emoji": "💨",
   "rarity": "uncommon",
   "pt": "respiração",
   "names": {
    "it": {
     "article": "il",
     "word": "respiro",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Atem",
     "gender": "m"
    },
    "ja": {
     "kanji": "息",
     "kana": "いき",
     "romaji": "iki"
    }
   }
  },
  {
   "id": "erro",
   "img": "assets/item/erro.png",
   "emoji": "❌",
   "rarity": "uncommon",
   "pt": "erro",
   "names": {
    "it": {
     "article": "l'",
     "word": "errore",
     "gender": "m"
    },
    "de": {
     "article": "der",
     "word": "Fehler",
     "gender": "m"
    },
    "ja": {
     "kanji": "間違い",
     "kana": "まちがい",
     "romaji": "machigai"
    }
   }
  },
  {
   "id": "baciami",
   "emoji": "💋",
   "rarity": "common",
   "pt": "me beija",
   "names": {
    "it": {
     "article": "",
     "word": "baciami",
     "gender": ""
    }
   }
  },
  {
   "id": "ancora",
   "emoji": "🔁",
   "rarity": "common",
   "pt": "de novo / ainda",
   "names": {
    "it": {
     "article": "",
     "word": "ancora",
     "gender": ""
    }
   }
  },
  {
   "id": "mi",
   "emoji": "🙋",
   "rarity": "common",
   "pt": "me / mim",
   "names": {
    "it": {
     "article": "",
     "word": "mi",
     "gender": ""
    }
   }
  },
  {
   "id": "ti",
   "emoji": "👉",
   "rarity": "common",
   "pt": "te / você",
   "names": {
    "it": {
     "article": "",
     "word": "ti",
     "gender": ""
    }
   }
  },
  {
   "id": "abbracciami",
   "emoji": "🤗",
   "rarity": "uncommon",
   "pt": "me abraça",
   "names": {
    "it": {
     "article": "",
     "word": "abbracciami",
     "gender": ""
    }
   }
  },
  {
   "id": "guardami",
   "emoji": "👀",
   "rarity": "uncommon",
   "pt": "olha pra mim",
   "names": {
    "it": {
     "article": "",
     "word": "guardami",
     "gender": ""
    }
   }
  },
  {
   "id": "dimmi",
   "emoji": "💬",
   "rarity": "uncommon",
   "pt": "me diz",
   "names": {
    "it": {
     "article": "",
     "word": "dimmi",
     "gender": ""
    }
   }
  },
  {
   "id": "aspettami",
   "emoji": "⏳",
   "rarity": "uncommon",
   "pt": "me espera",
   "names": {
    "it": {
     "article": "",
     "word": "aspettami",
     "gender": ""
    }
   }
  },
  {
   "id": "chiamami",
   "emoji": "📞",
   "rarity": "uncommon",
   "pt": "me liga",
   "names": {
    "it": {
     "article": "",
     "word": "chiamami",
     "gender": ""
    }
   }
  },
  {
   "id": "dammi-un-bacio",
   "emoji": "😘",
   "rarity": "rare",
   "pt": "me dá um beijo",
   "names": {
    "it": {
     "article": "",
     "word": "dammi un bacio",
     "gender": ""
    }
   }
  },
  {
   "id": "ti-amo",
   "emoji": "❤️",
   "rarity": "rare",
   "pt": "eu te amo",
   "names": {
    "it": {
     "article": "",
     "word": "ti amo",
     "gender": ""
    }
   }
  },
  {
   "id": "per-sempre",
   "emoji": "♾️",
   "rarity": "rare",
   "pt": "para sempre",
   "names": {
    "it": {
     "article": "",
     "word": "per sempre",
     "gender": ""
    }
   }
  }
 ],
 "monsters": [
  {
   "id": "rato",
   "emoji": "🐀",
   "pt": "rato"
  },
  {
   "id": "cobra",
   "emoji": "🐍",
   "pt": "cobra"
  },
  {
   "id": "ogro",
   "emoji": "👹",
   "pt": "ogro"
  },
  {
   "id": "dragao-chefe",
   "emoji": "🐲",
   "pt": "Babel, o Dragão"
  },
  {
   "id": "morcego",
   "img": "assets/mon/morcego.png",
   "emoji": "🦇",
   "pt": "morcego"
  },
  {
   "id": "aranha",
   "img": "assets/mon/aranha.png",
   "emoji": "🕷️",
   "pt": "aranha"
  },
  {
   "id": "planta",
   "img": "assets/mon/planta.png",
   "emoji": "🌱",
   "pt": "planta carnívora"
  },
  {
   "id": "lobo-cinzento",
   "img": "assets/mon/lobo.png",
   "emoji": "🐺",
   "pt": "lobo cinzento"
  },
  {
   "id": "lobo-sombrio",
   "img": "assets/mon/lobo.png",
   "emoji": "🐺",
   "pt": "Lobo Sombrio",
   "fx": "boss"
  },
  {
   "id": "slime",
   "img": "assets/mon/slime-verde.png",
   "emoji": "🟢",
   "pt": "slime verde"
  },
  {
   "id": "goblin",
   "img": "assets/mon/goblin.png",
   "emoji": "👺",
   "pt": "goblin"
  },
  {
   "id": "mago-sombrio",
   "img": "assets/mon/mago.png",
   "emoji": "🧙",
   "pt": "Mago Sombrio"
  },
  {
   "id": "rei-goblin",
   "img": "assets/mon/goblin.png",
   "emoji": "👺",
   "pt": "Rei Goblin",
   "fx": "boss"
  },
  {
   "id": "slime-fogo",
   "img": "assets/mon/slime-fogo.png",
   "emoji": "🔥",
   "pt": "slime de fogo"
  },
  {
   "id": "esqueleto-arqueiro",
   "img": "assets/mon/esqueleto-arqueiro.png",
   "emoji": "💀",
   "pt": "esqueleto arqueiro"
  },
  {
   "id": "golem",
   "img": "assets/mon/golem.png",
   "emoji": "🗿",
   "pt": "golem de pedra"
  },
  {
   "id": "esqueleto",
   "img": "assets/mon/esqueleto.png",
   "emoji": "💀",
   "pt": "capitão esqueleto"
  },
  {
   "id": "golem-de-fogo",
   "img": "assets/mon/golem.png",
   "emoji": "🗿",
   "pt": "Golem de Fogo",
   "fx": "fire"
  },
  {
   "id": "gato-sombra",
   "flip": true,
   "img": "assets/mon/gato-sombra.png",
   "emoji": "🐈‍⬛",
   "pt": "gato das sombras"
  },
  {
   "id": "lampiao",
   "img": "assets/mon/lampiao.png",
   "emoji": "🏮",
   "pt": "lampião fantasma"
  },
  {
   "id": "pombo-ladrao",
   "flip": true,
   "img": "assets/mon/pombo-ladrao.png",
   "emoji": "🐦",
   "pt": "pombo ladrão"
  },
  {
   "id": "cao-eco",
   "flip": true,
   "img": "assets/mon/cao-eco.png",
   "emoji": "🐺",
   "pt": "cão do eco"
  },
  {
   "id": "mestre-do-eco",
   "img": "assets/mon/mestre-eco.png",
   "emoji": "🧙",
   "pt": "Mestre do Eco",
   "fx": "boss"
  }
 ],
 "gear": [
  {
   "slot": "head",
   "img": "assets/item/elmo.png",
   "label": "Cabeça",
   "name": "Elmo do Escriba",
   "item": null,
   "emoji": "🪖",
   "rarity": "common",
   "flavor": "Faz você lembrar o nome de tudo o que vê."
  },
  {
   "slot": "hands",
   "img": "assets/item/luvas.png",
   "label": "Mãos",
   "name": "Luvas de Tinta",
   "item": null,
   "emoji": "🧤",
   "rarity": "common",
   "flavor": "Nunca deixam a pena do Escriba cair."
  },
  {
   "slot": "feet",
   "img": "assets/item/botas.png",
   "label": "Pés",
   "name": "Botas Andarilhas",
   "item": null,
   "emoji": "🥾",
   "rarity": "uncommon",
   "flavor": "Nunca perdem o caminho, nem entre frases enroladas."
  },
  {
   "slot": "cloak",
   "img": "assets/item/capa.png",
   "label": "Capa",
   "name": "Capa de Palavras",
   "item": null,
   "emoji": "🧥",
   "rarity": "uncommon",
   "flavor": "Tecida com palavras de proteção."
  },
  {
   "slot": "body",
   "img": "assets/item/armadura.png",
   "label": "Peito",
   "name": "Peitoral dos Nomes",
   "item": null,
   "emoji": "🥋",
   "rarity": "rare",
   "flavor": "Cada placa traz um nome gravado."
  },
  {
   "slot": "shield",
   "img": "assets/item/escudo.png",
   "label": "Escudo",
   "name": "Escudo da Lembrança",
   "item": null,
   "emoji": "🛡️",
   "rarity": "epic",
   "flavor": "Defendeu a aldeia do esquecimento."
  },
  {
   "slot": "weapon",
   "img": "assets/item/espada.png",
   "label": "Arma",
   "name": "Espada do Último Nome",
   "item": null,
   "emoji": "⚔️",
   "rarity": "legendary",
   "flavor": "Forjada com o último nome livre. Corta o silêncio."
  }
 ],
 "dungeon": {
  "start": 1,
  "viewBox": [
   360,
   480
  ],
  "rooms": [
   {
    "id": 1,
    "type": "start",
    "x": 180,
    "y": 444,
    "tier": 0,
    "links": [
     2,
     3
    ]
   },
   {
    "id": 2,
    "type": "chest",
    "x": 80,
    "y": 376,
    "tier": 0,
    "loot": "head",
    "links": [
     1,
     4
    ]
   },
   {
    "id": 3,
    "type": "monster",
    "x": 280,
    "y": 376,
    "tier": 0,
    "hp": 2,
    "loot": "hands",
    "role": "minion",
    "links": [
     1,
     5
    ]
   },
   {
    "id": 4,
    "type": "monster",
    "x": 80,
    "y": 308,
    "tier": 1,
    "hp": 2,
    "loot": "feet",
    "role": "minion",
    "links": [
     2,
     6
    ]
   },
   {
    "id": 5,
    "type": "chest",
    "x": 280,
    "y": 308,
    "tier": 1,
    "loot": "cloak",
    "links": [
     3,
     6
    ]
   },
   {
    "id": 6,
    "type": "rest",
    "x": 180,
    "y": 240,
    "tier": 1,
    "links": [
     4,
     5,
     7,
     8
    ]
   },
   {
    "id": 7,
    "type": "monster",
    "x": 90,
    "y": 172,
    "tier": 2,
    "hp": 3,
    "loot": "body",
    "role": "minion",
    "links": [
     6,
     9
    ]
   },
   {
    "id": 8,
    "type": "chest",
    "x": 270,
    "y": 172,
    "tier": 2,
    "loot": "shield",
    "links": [
     6,
     9
    ]
   },
   {
    "id": 9,
    "type": "monster",
    "x": 180,
    "y": 104,
    "tier": 3,
    "hp": 3,
    "loot": "weapon",
    "role": "elite",
    "links": [
     7,
     8,
     10
    ]
   },
   {
    "id": 10,
    "type": "boss",
    "x": 180,
    "y": 36,
    "w": 110,
    "h": 62,
    "tier": 4,
    "hp": 5,
    "dmg": 2,
    "role": "boss",
    "requires": {
     "gear": 5
    },
    "links": [
     9
    ]
   }
  ]
 },
 "story": {
  "title": "A Torre de Babel",
  "owl": "Ascolto",
  "intro": {
   "title": "O Último Escriba",
   "text": "Há muito tempo, o dragão Babel engoliu o Livro dos Nomes, e desde então ninguém lembra como se chamam as coisas. Você é o último Escriba e sobe a Torre com a coruja Ascolto, andar por andar, recolhendo as páginas do Livro. Em cada andar, as palavras da música da semana são a sua arma: diga o nome certo e as portas se abrem."
  },
  "lose": {
   "title": "O Nome se Apaga",
   "text": "A criatura devora o último pedaço do seu nome e as luzes se apagam. Ascolto te arrasta de volta à escada. As palavras que você aprendeu ficam com você. Respire fundo e suba de novo."
  }
 },
 "course": {
  "maxWeeks": 5,
  "days": 7,
  "betaWeeks": 1,
  "note": "Semana 1 = Baciami Ancora (Jovanotti). O jogo usa só as palavras que o app ensina na semana: caça-palavras (dia 1) e cards (dia 3). Enquanto um ícone não existe em assets/item, o jogo mostra o emoji.",
  "sources": {
   "caca": {
    "label": "caça-palavras",
    "day": 1
   },
   "cards": {
    "label": "cards da semana",
    "day": 3
   },
   "letra": {
    "label": "letra da música",
    "day": 5
   }
  },
  "core": {
   "title": "Vocabulário do jogo",
   "words": []
  },
  "weeks": [
   {
    "id": 1,
    "region": {
     "name": "Terraço da Noite",
     "emoji": "🌃",
     "floor": "Andar 1",
     "accent": "#ff8fb1",
     "bg": "assets/bg/terraco.jpg",
     "battle": {
      "monster": "assets/bg/terraco.jpg",
      "boss": "assets/bg/terraco.jpg",
      "chest": "assets/bg/terraco.jpg"
     },
     "page": "a Página da Música",
     "paint": {
      "img": "assets/map/terraco.jpg",
      "w": 1286,
      "h": 2754,
      "water": "assets/map/terraco-agua.png",
      "glow": "assets/map/terraco-brilho.png",
      "nodes": {
       "1": [
        660,
        2535
       ],
       "2": [
        630,
        2325
       ],
       "3": [
        480,
        2055
       ],
       "4": [
        720,
        1797
       ],
       "5": [
        600,
        1272
       ],
       "6": [
        740,
        1016
       ],
       "7": [
        408,
        930
       ],
       "8": [
        802,
        660
       ],
       "9": [
        735,
        450
       ],
       "10": [
        758,
        308
       ]
      },
      "links": {
       "1": [
        2
       ],
       "2": [
        1,
        3
       ],
       "3": [
        2,
        4
       ],
       "4": [
        3,
        5
       ],
       "5": [
        4,
        6
       ],
       "6": [
        5,
        7
       ],
       "7": [
        6,
        8
       ],
       "8": [
        7,
        9
       ],
       "9": [
        8,
        10
       ],
       "10": [
        9
       ]
      },
      "deco": [
       {
        "x": 438,
        "y": 2618,
        "img": "assets/hero/ascolto-apontando.png",
        "w": 120
       },
       {
        "x": 880,
        "y": 968,
        "img": "assets/hero/ascolto-dormindo.png",
        "w": 110
       }
      ],
      "path": [
       [
        660,
        2535
       ],
       [
        666,
        2523
       ],
       [
        670,
        2511
       ],
       [
        678,
        2499
       ],
       [
        686,
        2487
       ],
       [
        694,
        2478
       ],
       [
        706,
        2470
       ],
       [
        718,
        2464
       ],
       [
        730,
        2458
       ],
       [
        742,
        2452
       ],
       [
        754,
        2445
       ],
       [
        765,
        2438
       ],
       [
        776,
        2428
       ],
       [
        784,
        2420
       ],
       [
        795,
        2410
       ],
       [
        802,
        2398
       ],
       [
        808,
        2388
       ],
       [
        812,
        2374
       ],
       [
        810,
        2361
       ],
       [
        804,
        2349
       ],
       [
        794,
        2340
       ],
       [
        782,
        2336
       ],
       [
        768,
        2334
       ],
       [
        754,
        2334
       ],
       [
        741,
        2332
       ],
       [
        728,
        2332
       ],
       [
        714,
        2331
       ],
       [
        700,
        2331
       ],
       [
        687,
        2331
       ],
       [
        674,
        2331
       ],
       [
        660,
        2330
       ],
       [
        646,
        2330
       ],
       [
        633,
        2326
       ],
       [
        636,
        2319
       ],
       [
        650,
        2314
       ],
       [
        662,
        2310
       ],
       [
        675,
        2306
       ],
       [
        687,
        2301
       ],
       [
        699,
        2295
       ],
       [
        711,
        2288
       ],
       [
        723,
        2282
       ],
       [
        734,
        2274
       ],
       [
        746,
        2265
       ],
       [
        754,
        2256
       ],
       [
        764,
        2246
       ],
       [
        768,
        2234
       ],
       [
        770,
        2220
       ],
       [
        768,
        2206
       ],
       [
        765,
        2193
       ],
       [
        760,
        2181
       ],
       [
        753,
        2169
       ],
       [
        744,
        2160
       ],
       [
        734,
        2151
       ],
       [
        722,
        2144
       ],
       [
        711,
        2138
       ],
       [
        699,
        2130
       ],
       [
        687,
        2124
       ],
       [
        675,
        2118
       ],
       [
        663,
        2112
       ],
       [
        650,
        2108
       ],
       [
        638,
        2103
       ],
       [
        624,
        2098
       ],
       [
        612,
        2094
       ],
       [
        598,
        2090
       ],
       [
        586,
        2086
       ],
       [
        573,
        2082
       ],
       [
        560,
        2079
       ],
       [
        548,
        2076
       ],
       [
        534,
        2073
       ],
       [
        520,
        2072
       ],
       [
        507,
        2068
       ],
       [
        494,
        2066
       ],
       [
        483,
        2058
       ],
       [
        478,
        2046
       ],
       [
        482,
        2032
       ],
       [
        486,
        2020
       ],
       [
        490,
        2008
       ],
       [
        496,
        1996
       ],
       [
        504,
        1984
       ],
       [
        510,
        1972
       ],
       [
        518,
        1960
       ],
       [
        525,
        1950
       ],
       [
        534,
        1940
       ],
       [
        544,
        1930
       ],
       [
        554,
        1922
       ],
       [
        564,
        1911
       ],
       [
        573,
        1904
       ],
       [
        585,
        1894
       ],
       [
        596,
        1887
       ],
       [
        606,
        1880
       ],
       [
        618,
        1870
       ],
       [
        628,
        1863
       ],
       [
        639,
        1856
       ],
       [
        651,
        1848
       ],
       [
        662,
        1840
       ],
       [
        672,
        1832
       ],
       [
        682,
        1824
       ],
       [
        693,
        1815
       ],
       [
        704,
        1808
       ],
       [
        716,
        1800
       ],
       [
        728,
        1792
       ],
       [
        740,
        1788
       ],
       [
        752,
        1782
       ],
       [
        765,
        1778
       ],
       [
        777,
        1772
       ],
       [
        789,
        1766
       ],
       [
        801,
        1760
       ],
       [
        813,
        1754
       ],
       [
        825,
        1746
       ],
       [
        836,
        1738
       ],
       [
        848,
        1731
       ],
       [
        858,
        1724
       ],
       [
        867,
        1714
       ],
       [
        876,
        1704
       ],
       [
        884,
        1692
       ],
       [
        891,
        1682
       ],
       [
        896,
        1668
       ],
       [
        900,
        1656
       ],
       [
        900,
        1642
       ],
       [
        898,
        1629
       ],
       [
        892,
        1617
       ],
       [
        884,
        1606
       ],
       [
        874,
        1598
       ],
       [
        864,
        1588
       ],
       [
        852,
        1581
       ],
       [
        840,
        1574
       ],
       [
        828,
        1569
       ],
       [
        816,
        1564
       ],
       [
        802,
        1560
       ],
       [
        789,
        1556
       ],
       [
        777,
        1551
       ],
       [
        764,
        1546
       ],
       [
        752,
        1544
       ],
       [
        738,
        1539
       ],
       [
        724,
        1536
       ],
       [
        712,
        1532
       ],
       [
        699,
        1528
       ],
       [
        687,
        1524
       ],
       [
        674,
        1521
       ],
       [
        660,
        1516
       ],
       [
        648,
        1514
       ],
       [
        634,
        1509
       ],
       [
        622,
        1504
       ],
       [
        609,
        1500
       ],
       [
        596,
        1496
       ],
       [
        584,
        1491
       ],
       [
        572,
        1486
       ],
       [
        560,
        1480
       ],
       [
        548,
        1473
       ],
       [
        537,
        1464
       ],
       [
        526,
        1455
       ],
       [
        518,
        1446
       ],
       [
        508,
        1436
       ],
       [
        502,
        1424
       ],
       [
        498,
        1412
       ],
       [
        496,
        1398
       ],
       [
        498,
        1384
       ],
       [
        502,
        1372
       ],
       [
        510,
        1360
       ],
       [
        520,
        1352
       ],
       [
        530,
        1342
       ],
       [
        540,
        1334
       ],
       [
        550,
        1324
       ],
       [
        561,
        1317
       ],
       [
        573,
        1310
       ],
       [
        584,
        1302
       ],
       [
        596,
        1294
       ],
       [
        602,
        1284
       ],
       [
        594,
        1274
       ],
       [
        608,
        1272
       ],
       [
        621,
        1275
       ],
       [
        634,
        1278
       ],
       [
        648,
        1281
       ],
       [
        660,
        1284
       ],
       [
        674,
        1286
       ],
       [
        687,
        1288
       ],
       [
        700,
        1290
       ],
       [
        714,
        1290
       ],
       [
        728,
        1290
       ],
       [
        741,
        1288
       ],
       [
        754,
        1286
       ],
       [
        766,
        1281
       ],
       [
        778,
        1275
       ],
       [
        790,
        1268
       ],
       [
        800,
        1258
       ],
       [
        808,
        1248
       ],
       [
        816,
        1236
       ],
       [
        822,
        1224
       ],
       [
        826,
        1212
       ],
       [
        828,
        1198
       ],
       [
        828,
        1185
       ],
       [
        825,
        1172
       ],
       [
        819,
        1160
       ],
       [
        812,
        1148
       ],
       [
        802,
        1138
       ],
       [
        792,
        1130
       ],
       [
        782,
        1122
       ],
       [
        770,
        1114
       ],
       [
        759,
        1106
       ],
       [
        747,
        1100
       ],
       [
        735,
        1094
       ],
       [
        723,
        1088
       ],
       [
        712,
        1080
       ],
       [
        705,
        1070
       ],
       [
        717,
        1062
       ],
       [
        729,
        1058
       ],
       [
        742,
        1053
       ],
       [
        754,
        1048
       ],
       [
        766,
        1042
       ],
       [
        778,
        1036
       ],
       [
        790,
        1030
       ],
       [
        789,
        1022
       ],
       [
        777,
        1018
       ],
       [
        764,
        1017
       ],
       [
        750,
        1016
       ],
       [
        741,
        1017
       ],
       [
        754,
        1022
       ],
       [
        766,
        1028
       ],
       [
        771,
        1036
       ],
       [
        760,
        1046
       ],
       [
        748,
        1052
       ],
       [
        736,
        1058
       ],
       [
        723,
        1064
       ],
       [
        711,
        1066
       ],
       [
        698,
        1070
       ],
       [
        684,
        1070
       ],
       [
        670,
        1068
       ],
       [
        657,
        1065
       ],
       [
        644,
        1062
       ],
       [
        632,
        1058
       ],
       [
        620,
        1053
       ],
       [
        608,
        1046
       ],
       [
        596,
        1038
       ],
       [
        586,
        1029
       ],
       [
        578,
        1020
       ],
       [
        573,
        1006
       ],
       [
        573,
        993
       ],
       [
        573,
        980
       ],
       [
        564,
        969
       ],
       [
        552,
        963
       ],
       [
        540,
        957
       ],
       [
        526,
        952
       ],
       [
        514,
        950
       ],
       [
        501,
        946
       ],
       [
        488,
        944
       ],
       [
        474,
        942
       ],
       [
        460,
        939
       ],
       [
        448,
        938
       ],
       [
        435,
        934
       ],
       [
        422,
        933
       ],
       [
        408,
        930
       ],
       [
        420,
        930
       ],
       [
        434,
        932
       ],
       [
        447,
        933
       ],
       [
        460,
        934
       ],
       [
        474,
        936
       ],
       [
        488,
        939
       ],
       [
        500,
        945
       ],
       [
        512,
        951
       ],
       [
        524,
        957
       ],
       [
        537,
        960
       ],
       [
        550,
        957
       ],
       [
        561,
        950
       ],
       [
        570,
        939
       ],
       [
        579,
        928
       ],
       [
        585,
        918
       ],
       [
        591,
        906
       ],
       [
        597,
        894
       ],
       [
        604,
        882
       ],
       [
        614,
        872
       ],
       [
        624,
        864
       ],
       [
        636,
        856
       ],
       [
        646,
        849
       ],
       [
        657,
        840
       ],
       [
        658,
        828
       ],
       [
        651,
        816
       ],
       [
        640,
        807
       ],
       [
        630,
        800
       ],
       [
        620,
        792
       ],
       [
        609,
        783
       ],
       [
        598,
        774
       ],
       [
        588,
        766
       ],
       [
        578,
        758
       ],
       [
        567,
        748
       ],
       [
        560,
        738
       ],
       [
        554,
        726
       ],
       [
        548,
        714
       ],
       [
        544,
        700
       ],
       [
        543,
        687
       ],
       [
        544,
        674
       ],
       [
        549,
        662
       ],
       [
        555,
        650
       ],
       [
        564,
        639
       ],
       [
        574,
        632
       ],
       [
        588,
        628
       ],
       [
        602,
        628
       ],
       [
        615,
        630
       ],
       [
        628,
        632
       ],
       [
        642,
        634
       ],
       [
        656,
        636
       ],
       [
        668,
        639
       ],
       [
        681,
        642
       ],
       [
        694,
        644
       ],
       [
        708,
        646
       ],
       [
        722,
        650
       ],
       [
        734,
        652
       ],
       [
        747,
        654
       ],
       [
        760,
        656
       ],
       [
        774,
        657
       ],
       [
        788,
        658
       ],
       [
        801,
        660
       ],
       [
        790,
        657
       ],
       [
        777,
        656
       ],
       [
        764,
        652
       ],
       [
        750,
        651
       ],
       [
        738,
        648
       ],
       [
        724,
        646
       ],
       [
        711,
        644
       ],
       [
        698,
        642
       ],
       [
        684,
        639
       ],
       [
        670,
        638
       ],
       [
        657,
        634
       ],
       [
        645,
        630
       ],
       [
        632,
        626
       ],
       [
        620,
        621
       ],
       [
        608,
        615
       ],
       [
        596,
        609
       ],
       [
        584,
        602
       ],
       [
        578,
        591
       ],
       [
        579,
        578
       ],
       [
        586,
        566
       ],
       [
        594,
        555
       ],
       [
        603,
        544
       ],
       [
        612,
        536
       ],
       [
        622,
        526
       ],
       [
        634,
        520
       ],
       [
        648,
        514
       ],
       [
        660,
        510
       ],
       [
        672,
        504
       ],
       [
        684,
        496
       ],
       [
        694,
        489
       ],
       [
        704,
        480
       ],
       [
        714,
        471
       ],
       [
        724,
        462
       ],
       [
        734,
        453
       ],
       [
        738,
        440
       ],
       [
        740,
        428
       ],
       [
        742,
        414
       ],
       [
        744,
        400
       ],
       [
        747,
        387
       ],
       [
        748,
        374
       ],
       [
        750,
        360
       ],
       [
        752,
        346
       ],
       [
        754,
        333
       ],
       [
        756,
        320
       ]
      ]
     }
    },
    "song": {
     "it": {
      "title": "Baciami Ancora",
      "artist": "Jovanotti"
     },
     "de": {
      "title": "Baciami Ancora",
      "artist": "Jovanotti"
     },
     "ja": {
      "title": "Baciami Ancora",
      "artist": "Jovanotti"
     }
    },
    "monsters": {
     "minion": [
      "gato-sombra",
      "lampiao",
      "pombo-ladrao"
     ],
     "elite": [
      "cao-eco"
     ],
     "boss": "mestre-do-eco"
    },
    "words": [
     {
      "item": "baciami",
      "src": "caca"
     },
     {
      "item": "ancora",
      "src": "caca"
     },
     {
      "item": "mi",
      "src": "caca"
     },
     {
      "item": "ti",
      "src": "caca"
     },
     {
      "item": "abbracciami",
      "src": "cards"
     },
     {
      "item": "guardami",
      "src": "cards"
     },
     {
      "item": "dimmi",
      "src": "cards"
     },
     {
      "item": "aspettami",
      "src": "cards"
     },
     {
      "item": "chiamami",
      "src": "cards"
     },
     {
      "item": "dammi-un-bacio",
      "src": "cards"
     },
     {
      "item": "ti-amo",
      "src": "cards"
     },
     {
      "item": "per-sempre",
      "src": "cards"
     }
    ],
    "boss": {
     "lines": {
      "it": [
       {
        "pt": "Me beija de novo.",
        "t": "Baciami@baciami ancora@ancora."
       },
       {
        "pt": "Você me beija de novo?",
        "t": "Mi@mi baci ancora@ancora?"
       },
       {
        "pt": "Ainda penso em você.",
        "t": "Ti@ti penso ancora@ancora."
       },
       {
        "pt": "Me abraça forte.",
        "t": "Abbracciami@abbracciami forte."
       },
       {
        "pt": "Olha nos meus olhos.",
        "t": "Guardami@guardami negli occhi."
       },
       {
        "pt": "Me diz a verdade.",
        "t": "Dimmi@dimmi la verità."
       },
       {
        "pt": "Me espera aqui, volto já.",
        "t": "Aspettami@aspettami qui, torno subito."
       },
       {
        "pt": "Me liga hoje à noite.",
        "t": "Chiamami@chiamami stasera."
       },
       {
        "pt": "Me dá um beijo, vai!",
        "t": "Dammi@dammi-un-bacio un bacio, dai!"
       },
       {
        "pt": "Te amo mais do que ontem.",
        "t": "Ti@ti amo@ti-amo più di ieri."
       },
       {
        "pt": "Fica comigo para sempre.",
        "t": "Resta con me per@per-sempre sempre."
       }
      ]
     }
    },
    "beats": {
     "1": {
      "title": "A Escada para o Terraço",
      "text": "Você sobe os degraus e a Torre se abre num terraço sobre uma cidade à noite. A lua pende sobre os telhados e Ascolto sussurra: «Aqui as palavras vêm cantadas. Escute, repita e a música volta.»"
     },
     "2": {
      "title": "O Baú da Varanda",
      "text": "Numa varanda cheia de vasos, o baú guarda um elmo. A casa inteira dorme, e só um nome dito com carinho abre o cadeado."
     },
     "3": {
      "title": "Sombras na Rua",
      "text": "Criaturas rondam a rua vazia e roubam os nomes dos postes. Devolva cada um e elas largam o que levaram."
     },
     "4": {
      "title": "A Ponte sobre o Rio",
      "text": "Uma ponte estreita cruza o rio, e cada a onda repete um nome esquecido. Atravesse devolvendo as palavras."
     },
     "5": {
      "title": "O Baú da Arcada",
      "text": "Sob as arcadas da casa sobre o rio, uma luz quente vem de um o quarto no alto. Um baú guarda uma capa macia, e o caderno aberto sobre ele pede o nome do que se vê pela janela."
     },
     "6": {
      "title": "O Mirante",
      "text": "No mirante você descansa. O céu está limpo, a estrela acende uma a uma, e Ascolto assobia uma melodia que você quase reconhece."
     },
     "7": {
      "title": "O Guarda do Eco",
      "text": "Uma criatura feita de ecos repete tudo o que você diz, só que errado. Cada nome certo apaga um eco."
     },
     "8": {
      "title": "O Espelho da Praça",
      "text": "Na praça, o espelho de moldura dourada esconde o baú do escudo. Quem diz o nome sem hesitar vê o reflexo se abrir."
     },
     "9": {
      "title": "O Capitão da Noite",
      "text": "Um capitão de ossos vigia a escada final, sob a luz fria de um poste. Suas peças brilham, e as suas também. Falta pouco."
     },
     "10": {
      "title": "O Mestre do Eco",
      "text": "O Mestre do Eco guarda a Página da Música. Com a espada em punho, diga os nomes que ele repetiu errado, um por um."
     },
     "win": {
      "title": "A Página da Música",
      "text": "O Mestre do Eco vira poeira de notas, e a página voa para o seu bolso. Ao longe, a cidade inteira parece cantar. Ascolto sorri: «Gostou? Ainda tem muito andar pela frente.»"
     }
    }
   },
   {
    "id": 2,
    "region": {
     "name": "Floresta da Lua",
     "emoji": "🌲",
     "floor": "Andar 1",
     "accent": "#7fb6ff",
     "bg": "assets/bg/floresta.jpg",
     "page": "a Página da Noite",
     "paint": {
      "img": "assets/map/floresta.jpg",
      "w": 1408,
      "h": 3008,
      "water": "assets/map/floresta-agua.png",
      "glow": "assets/map/floresta-brilho.png",
      "nodes": {
       "1": [
        460,
        2890
       ],
       "2": [
        1037,
        2476
       ],
       "3": [
        865,
        2265
       ],
       "4": [
        754,
        1789
       ],
       "5": [
        1003,
        1723
       ],
       "6": [
        404,
        1340
       ],
       "7": [
        741,
        1185
       ],
       "8": [
        1028,
        1044
       ],
       "9": [
        470,
        665
       ],
       "10": [
        697,
        505
       ]
      },
      "links": {
       "1": [
        2
       ],
       "2": [
        1,
        3
       ],
       "3": [
        2,
        4
       ],
       "4": [
        3,
        5
       ],
       "5": [
        4,
        6
       ],
       "6": [
        5,
        7
       ],
       "7": [
        6,
        8
       ],
       "8": [
        7,
        9
       ],
       "9": [
        8,
        10
       ],
       "10": [
        9
       ]
      },
      "deco": [
       {
        "x": 441,
        "y": 2087,
        "img": "assets/hero/ascolto-apontando.png",
        "w": 150
       },
       {
        "x": 865,
        "y": 866,
        "img": "assets/hero/ascolto-dormindo.png",
        "w": 150
       }
      ],
      "path": [
       [
        457,
        2914
       ],
       [
        453,
        2906
       ],
       [
        455,
        2896
       ],
       [
        463,
        2890
       ],
       [
        475,
        2887
       ],
       [
        487,
        2886
       ],
       [
        499,
        2886
       ],
       [
        511,
        2884
       ],
       [
        523,
        2882
       ],
       [
        535,
        2880
       ],
       [
        547,
        2878
       ],
       [
        559,
        2873
       ],
       [
        570,
        2865
       ],
       [
        581,
        2855
       ],
       [
        592,
        2845
       ],
       [
        602,
        2834
       ],
       [
        611,
        2822
       ],
       [
        616,
        2810
       ],
       [
        617,
        2798
       ],
       [
        617,
        2786
       ],
       [
        617,
        2774
       ],
       [
        617,
        2762
       ],
       [
        617,
        2750
       ],
       [
        619,
        2738
       ],
       [
        622,
        2726
       ],
       [
        626,
        2714
       ],
       [
        630,
        2702
       ],
       [
        636,
        2690
       ],
       [
        645,
        2678
       ],
       [
        655,
        2668
       ],
       [
        666,
        2659
       ],
       [
        678,
        2652
       ],
       [
        690,
        2646
       ],
       [
        702,
        2641
       ],
       [
        714,
        2635
       ],
       [
        725,
        2628
       ],
       [
        737,
        2621
       ],
       [
        749,
        2617
       ],
       [
        761,
        2614
       ],
       [
        773,
        2612
       ],
       [
        785,
        2608
       ],
       [
        797,
        2605
       ],
       [
        809,
        2602
       ],
       [
        821,
        2598
       ],
       [
        833,
        2595
       ],
       [
        845,
        2592
       ],
       [
        857,
        2589
       ],
       [
        869,
        2584
       ],
       [
        881,
        2579
       ],
       [
        893,
        2574
       ],
       [
        905,
        2570
       ],
       [
        917,
        2566
       ],
       [
        929,
        2563
       ],
       [
        941,
        2561
       ],
       [
        953,
        2558
       ],
       [
        965,
        2554
       ],
       [
        977,
        2547
       ],
       [
        987,
        2538
       ],
       [
        994,
        2527
       ],
       [
        1002,
        2515
       ],
       [
        1011,
        2504
       ],
       [
        1021,
        2493
       ],
       [
        1029,
        2482
       ],
       [
        1034,
        2470
       ],
       [
        1037,
        2458
       ],
       [
        1036,
        2446
       ],
       [
        1032,
        2434
       ],
       [
        1029,
        2422
       ],
       [
        1025,
        2410
       ],
       [
        1022,
        2398
       ],
       [
        1017,
        2386
       ],
       [
        1012,
        2374
       ],
       [
        1004,
        2362
       ],
       [
        995,
        2350
       ],
       [
        984,
        2339
       ],
       [
        972,
        2330
       ],
       [
        960,
        2321
       ],
       [
        949,
        2314
       ],
       [
        937,
        2308
       ],
       [
        925,
        2301
       ],
       [
        913,
        2294
       ],
       [
        901,
        2288
       ],
       [
        889,
        2282
       ],
       [
        877,
        2276
       ],
       [
        865,
        2271
       ],
       [
        853,
        2267
       ],
       [
        841,
        2263
       ],
       [
        829,
        2259
       ],
       [
        817,
        2256
       ],
       [
        805,
        2252
       ],
       [
        793,
        2250
       ],
       [
        781,
        2248
       ],
       [
        769,
        2245
       ],
       [
        757,
        2243
       ],
       [
        745,
        2242
       ],
       [
        733,
        2240
       ],
       [
        721,
        2239
       ],
       [
        709,
        2237
       ],
       [
        697,
        2234
       ],
       [
        685,
        2231
       ],
       [
        673,
        2228
       ],
       [
        661,
        2224
       ],
       [
        649,
        2220
       ],
       [
        637,
        2216
       ],
       [
        625,
        2212
       ],
       [
        613,
        2210
       ],
       [
        601,
        2207
       ],
       [
        589,
        2203
       ],
       [
        577,
        2200
       ],
       [
        565,
        2199
       ],
       [
        553,
        2196
       ],
       [
        541,
        2192
       ],
       [
        529,
        2185
       ],
       [
        517,
        2177
       ],
       [
        506,
        2167
       ],
       [
        496,
        2156
       ],
       [
        489,
        2144
       ],
       [
        483,
        2132
       ],
       [
        478,
        2120
       ],
       [
        474,
        2108
       ],
       [
        472,
        2096
       ],
       [
        475,
        2084
       ],
       [
        479,
        2072
       ],
       [
        483,
        2060
       ],
       [
        488,
        2048
       ],
       [
        493,
        2036
       ],
       [
        498,
        2024
       ],
       [
        504,
        2012
       ],
       [
        513,
        2003
       ],
       [
        525,
        1995
       ],
       [
        537,
        1988
       ],
       [
        549,
        1980
       ],
       [
        561,
        1973
       ],
       [
        573,
        1967
       ],
       [
        585,
        1963
       ],
       [
        597,
        1960
       ],
       [
        609,
        1958
       ],
       [
        621,
        1956
       ],
       [
        633,
        1952
       ],
       [
        645,
        1948
       ],
       [
        657,
        1945
       ],
       [
        669,
        1941
       ],
       [
        681,
        1938
       ],
       [
        693,
        1935
       ],
       [
        705,
        1931
       ],
       [
        717,
        1926
       ],
       [
        729,
        1920
       ],
       [
        741,
        1914
       ],
       [
        753,
        1908
       ],
       [
        764,
        1900
       ],
       [
        775,
        1890
       ],
       [
        785,
        1885
       ],
       [
        796,
        1886
       ],
       [
        808,
        1887
       ],
       [
        820,
        1887
       ],
       [
        832,
        1885
       ],
       [
        844,
        1883
       ],
       [
        856,
        1881
       ],
       [
        868,
        1879
       ],
       [
        880,
        1876
       ],
       [
        892,
        1874
       ],
       [
        904,
        1869
       ],
       [
        916,
        1862
       ],
       [
        927,
        1853
       ],
       [
        939,
        1844
       ],
       [
        951,
        1836
       ],
       [
        962,
        1827
       ],
       [
        970,
        1816
       ],
       [
        975,
        1804
       ],
       [
        980,
        1792
       ],
       [
        984,
        1780
       ],
       [
        988,
        1768
       ],
       [
        991,
        1756
       ],
       [
        994,
        1744
       ],
       [
        1001,
        1733
       ],
       [
        1009,
        1722
       ],
       [
        1015,
        1710
       ],
       [
        1016,
        1698
       ],
       [
        1016,
        1686
       ],
       [
        1015,
        1674
       ],
       [
        1014,
        1662
       ],
       [
        1012,
        1650
       ],
       [
        1009,
        1638
       ],
       [
        1006,
        1626
       ],
       [
        1002,
        1614
       ],
       [
        999,
        1602
       ],
       [
        996,
        1590
       ],
       [
        991,
        1578
       ],
       [
        983,
        1567
       ],
       [
        976,
        1555
       ],
       [
        968,
        1543
       ],
       [
        960,
        1532
       ],
       [
        950,
        1522
       ],
       [
        939,
        1515
       ],
       [
        927,
        1513
       ],
       [
        915,
        1513
       ],
       [
        903,
        1512
       ],
       [
        823,
        1452
       ],
       [
        699,
        1348
       ],
       [
        583,
        1252
       ],
       [
        566,
        1249
       ],
       [
        554,
        1255
       ],
       [
        542,
        1262
       ],
       [
        530,
        1267
       ],
       [
        518,
        1271
       ],
       [
        506,
        1276
       ],
       [
        495,
        1283
       ],
       [
        484,
        1293
       ],
       [
        472,
        1304
       ],
       [
        461,
        1314
       ],
       [
        449,
        1322
       ],
       [
        437,
        1328
       ],
       [
        425,
        1334
       ],
       [
        415,
        1339
       ],
       [
        413,
        1340
       ],
       [
        420,
        1336
       ],
       [
        432,
        1330
       ],
       [
        444,
        1324
       ],
       [
        456,
        1317
       ],
       [
        467,
        1308
       ],
       [
        479,
        1298
       ],
       [
        490,
        1287
       ],
       [
        501,
        1279
       ],
       [
        513,
        1273
       ],
       [
        525,
        1269
       ],
       [
        537,
        1264
       ],
       [
        549,
        1258
       ],
       [
        561,
        1252
       ],
       [
        573,
        1246
       ],
       [
        585,
        1242
       ],
       [
        597,
        1238
       ],
       [
        609,
        1235
       ],
       [
        621,
        1232
       ],
       [
        633,
        1231
       ],
       [
        645,
        1229
       ],
       [
        657,
        1228
       ],
       [
        669,
        1226
       ],
       [
        681,
        1224
       ],
       [
        693,
        1222
       ],
       [
        704,
        1219
       ],
       [
        715,
        1213
       ],
       [
        725,
        1203
       ],
       [
        736,
        1195
       ],
       [
        748,
        1191
       ],
       [
        760,
        1190
       ],
       [
        772,
        1191
       ],
       [
        784,
        1190
       ],
       [
        796,
        1187
       ],
       [
        808,
        1185
       ],
       [
        820,
        1182
       ],
       [
        832,
        1181
       ],
       [
        844,
        1180
       ],
       [
        856,
        1178
       ],
       [
        868,
        1174
       ],
       [
        880,
        1170
       ],
       [
        892,
        1166
       ],
       [
        904,
        1161
       ],
       [
        916,
        1156
       ],
       [
        928,
        1148
       ],
       [
        940,
        1140
       ],
       [
        952,
        1134
       ],
       [
        964,
        1128
       ],
       [
        974,
        1120
       ],
       [
        982,
        1110
       ],
       [
        988,
        1098
       ],
       [
        993,
        1086
       ],
       [
        999,
        1074
       ],
       [
        1007,
        1062
       ],
       [
        1013,
        1050
       ],
       [
        1014,
        1038
       ],
       [
        1012,
        1026
       ],
       [
        1010,
        1014
       ],
       [
        1006,
        1002
       ],
       [
        1003,
        990
       ],
       [
        1000,
        978
       ],
       [
        996,
        966
       ],
       [
        989,
        954
       ],
       [
        980,
        943
       ],
       [
        969,
        933
       ],
       [
        957,
        922
       ],
       [
        945,
        913
       ],
       [
        933,
        905
       ],
       [
        921,
        899
       ],
       [
        909,
        893
       ],
       [
        897,
        887
       ],
       [
        885,
        881
       ],
       [
        873,
        875
       ],
       [
        861,
        871
       ],
       [
        849,
        870
       ],
       [
        837,
        869
       ],
       [
        825,
        867
       ],
       [
        813,
        864
       ],
       [
        801,
        862
       ],
       [
        789,
        860
       ],
       [
        777,
        859
       ],
       [
        765,
        859
       ],
       [
        753,
        859
       ],
       [
        741,
        858
       ],
       [
        729,
        856
       ],
       [
        717,
        854
       ],
       [
        705,
        851
       ],
       [
        693,
        848
       ],
       [
        681,
        846
       ],
       [
        669,
        845
       ],
       [
        657,
        844
       ],
       [
        645,
        843
       ],
       [
        633,
        842
       ],
       [
        621,
        840
       ],
       [
        609,
        838
       ],
       [
        597,
        836
       ],
       [
        585,
        832
       ],
       [
        573,
        827
       ],
       [
        561,
        822
       ],
       [
        549,
        818
       ],
       [
        537,
        815
       ],
       [
        525,
        810
       ],
       [
        513,
        805
       ],
       [
        501,
        797
       ],
       [
        491,
        788
       ],
       [
        483,
        777
       ],
       [
        478,
        765
       ],
       [
        474,
        753
       ],
       [
        470,
        741
       ],
       [
        467,
        729
       ],
       [
        463,
        717
       ],
       [
        462,
        705
       ],
       [
        463,
        693
       ],
       [
        468,
        681
       ],
       [
        476,
        670
       ],
       [
        487,
        663
       ],
       [
        499,
        657
       ],
       [
        511,
        653
       ],
       [
        523,
        647
       ],
       [
        535,
        641
       ],
       [
        547,
        637
       ],
       [
        559,
        632
       ],
       [
        570,
        627
       ],
       [
        582,
        623
       ],
       [
        594,
        623
       ],
       [
        606,
        623
       ],
       [
        618,
        622
       ],
       [
        630,
        620
       ],
       [
        642,
        615
       ],
       [
        654,
        612
       ],
       [
        665,
        607
       ],
       [
        675,
        599
       ],
       [
        681,
        588
       ],
       [
        684,
        576
       ],
       [
        688,
        564
       ],
       [
        692,
        552
       ],
       [
        696,
        540
       ],
       [
        698,
        528
       ],
       [
        702,
        517
       ],
       [
        708,
        511
       ],
       [
        713,
        508
       ]
      ]
     }
    },
    "song": {
     "it": {
      "title": "Luna sul Bosco",
      "artist": "Artista de exemplo"
     },
     "de": {
      "title": "Mondnacht im Wald",
      "artist": "Artista de exemplo"
     },
     "ja": {
      "title": "月夜の森",
      "artist": "Artista de exemplo"
     }
    },
    "monsters": {
     "minion": [
      "morcego",
      "aranha",
      "planta"
     ],
     "elite": [
      "lobo-cinzento"
     ],
     "boss": "lobo-sombrio"
    },
    "words": [
     {
      "item": "coruja",
      "src": "caca"
     },
     {
      "item": "lobo",
      "src": "caca"
     },
     {
      "item": "cogumelo",
      "src": "cards"
     },
     {
      "item": "vela",
      "src": "cards"
     },
     {
      "item": "fogo",
      "src": "cards"
     },
     {
      "item": "pedra",
      "src": "cards"
     },
     {
      "item": "osso",
      "src": "cards"
     },
     {
      "item": "lanterna",
      "src": "letra"
     },
     {
      "item": "fantasma",
      "src": "letra"
     }
    ],
    "boss": {
     "lines": {
      "it": [
       {
        "pt": "O lobo vê a lua.",
        "t": "Il lupo@lobo vede la luna@lua."
       },
       {
        "pt": "A coruja olha a estrela.",
        "t": "Il gufo@coruja guarda la stella@estrela."
       },
       {
        "pt": "Tenho a espada e a chave.",
        "t": "Ho la spada@espada e la chiave@chave."
       },
       {
        "pt": "A vela e o fogo iluminam a pedra.",
        "t": "La candela@vela e il fuoco@fogo illuminano la pietra@pedra."
       },
       {
        "pt": "A lanterna mostra o mapa ao fantasma.",
        "t": "La lanterna@lanterna mostra la mappa@mapa al fantasma@fantasma."
       }
      ],
      "de": [
       {
        "pt": "O lobo vê a lua.",
        "t": "Der Wolf@lobo sieht den Mond@lua."
       },
       {
        "pt": "A coruja olha a estrela.",
        "t": "Die Eule@coruja sieht den Stern@estrela."
       },
       {
        "pt": "Tenho a espada e a chave.",
        "t": "Ich habe das Schwert@espada und den Schlüssel@chave."
       },
       {
        "pt": "A vela e o fogo iluminam a pedra.",
        "t": "Die Kerze@vela und das Feuer@fogo erhellen den Stein@pedra."
       },
       {
        "pt": "A lanterna mostra o mapa ao fantasma.",
        "t": "Die Laterne@lanterna zeigt dem Gespenst@fantasma die Karte@mapa."
       }
      ],
      "ja": [
       {
        "pt": "O lobo vê a lua.",
        "t": "狼@lobo は 月@lua を 見る。"
       },
       {
        "pt": "A coruja olha a estrela.",
        "t": "梟@coruja は 星@estrela を 見る。"
       },
       {
        "pt": "Tenho a espada e a chave.",
        "t": "剣@espada と 鍵@chave が ある。"
       },
       {
        "pt": "A vela e o fogo iluminam a pedra.",
        "t": "蝋燭@vela と 火@fogo が 石@pedra を 照らす。"
       },
       {
        "pt": "A lanterna mostra o mapa ao fantasma.",
        "t": "提灯@lanterna は 幽霊@fantasma に 地図@mapa を 見せる。"
       }
      ]
     }
    },
    "beats": {
     "1": {
      "title": "A Porta de Casca",
      "text": "Na base da Torre, uma floresta cresce dentro das paredes. {A|lua} brilha numa janela que não existe. Ascolto, sua {a|coruja}, sussurra: «Cada andar guarda uma página do Livro. Diga o nome certo e ela se solta.»"
     },
     "2": {
      "title": "O Baú sob a Raiz",
      "text": "Entre as raízes, {o|bau} do primeiro Escriba guarda o seu elmo. Um {o|cogumelo} brilhante ilumina o cadeado, que só cede ao nome certo."
     },
     "3": {
      "title": "Olhos no Escuro",
      "text": "Dois olhos amarelos piscam entre os troncos. Uma criatura roubou o nome de {o|fogo}, e agora o breu cobre tudo. Devolva as palavras e a luz volta."
     },
     "4": {
      "title": "O Rastro de Ossos",
      "text": "Pelo chão, um rastro de {o|osso} e {a|pedra} polida leva mais fundo. Algo passou por aqui e não quer ser seguido."
     },
     "5": {
      "title": "A Vela Esquecida",
      "text": "Num tronco oco, {a|vela} ainda arde. Ao lado, um baú guarda uma capa tecida com palavras. O cadeado pede o nome da luz."
     },
     "6": {
      "title": "A Clareira",
      "text": "Uma clareira silenciosa. Você bebe {a|pocao} de ervas, abre {o|mapa} e deixa Ascolto alisar as penas. Cada nome que você disse já ilumina um pedaço do caminho."
     },
     "7": {
      "title": "O Guarda sem Nome",
      "text": "Uma criatura sem nome bloqueia a passagem, arrastando uma corrente de letras, como {o|fantasma} que esqueceu quem era. Cada nome certo quebra um elo."
     },
     "8": {
      "title": "A Estrela Escondida",
      "text": "Sob {a|estrela} pintada no teto, um baú de prata guarda o escudo da floresta. Só um nome dito sem hesitar o abre."
     },
     "9": {
      "title": "A Guarda do Alfa",
      "text": "Um {o|lobo} enorme vigia o corredor final. Sua {a|lanterna} treme, mas as peças que você veste já brilham. Falta pouco."
     },
     "10": {
      "title": "O Lobo Sombrio",
      "text": "O Lobo Sombrio uiva sobre a Página da Noite. Com {a|espada} em punho, diga os nomes que ele esqueceu, e a página será sua."
     },
     "win": {
      "title": "A Primeira Página",
      "text": "O lobo se desfaz em letras de prata e a Página da Noite voa para o seu bolso. Pela janela, {a|lua} parece sorrir. Ascolto crocita: «Mais um andar, Escriba.» Lá em cima, algo enorme respira."
     }
    }
   },
   {
    "id": 3,
    "region": {
     "name": "Vila do Pão Perdido",
     "emoji": "🏘️",
     "floor": "Andar 2",
     "accent": "#FFD166",
     "bg": "assets/bg/cidade.jpg",
     "page": "a Página da Fome"
    },
    "song": {
     "it": {
      "title": "Il Canto del Villaggio",
      "artist": "Artista de exemplo"
     },
     "de": {
      "title": "Das Lied vom Dorf",
      "artist": "Artista de exemplo"
     },
     "ja": {
      "title": "村の歌",
      "artist": "Artista de exemplo"
     }
    },
    "monsters": {
     "minion": [
      "slime",
      "goblin"
     ],
     "elite": [
      "mago-sombrio"
     ],
     "boss": "rei-goblin"
    },
    "words": [
     {
      "item": "pao",
      "src": "caca"
     },
     {
      "item": "agua",
      "src": "caca"
     },
     {
      "item": "queijo",
      "src": "caca"
     },
     {
      "item": "maca",
      "src": "caca"
     },
     {
      "item": "moeda",
      "src": "cards"
     },
     {
      "item": "corda",
      "src": "cards"
     },
     {
      "item": "livro",
      "src": "cards"
     },
     {
      "item": "martelo",
      "src": "cards"
     },
     {
      "item": "pergaminho",
      "src": "cards"
     },
     {
      "item": "castelo",
      "src": "letra"
     },
     {
      "item": "coroa",
      "src": "letra"
     },
     {
      "item": "anel",
      "src": "letra"
     }
    ],
    "boss": {
     "lines": {
      "it": [
       {
        "pt": "Eu como o pão.",
        "t": "Mangio il pane@pao."
       },
       {
        "pt": "Bebo a água e como a maçã.",
        "t": "Bevo l'acqua@agua e mangio la mela@maca."
       },
       {
        "pt": "O queijo e o pão estão na mochila.",
        "t": "Il formaggio@queijo e il pane@pao sono nello zaino@mochila."
       },
       {
        "pt": "O martelo e a corda estão sobre o pergaminho.",
        "t": "Il martello@martello e la corda@corda sono sulla pergamena@pergaminho."
       },
       {
        "pt": "No castelo há a coroa e o anel.",
        "t": "Nel castello@castelo ci sono la corona@coroa e l'anello@anel."
       }
      ],
      "de": [
       {
        "pt": "Eu como o pão.",
        "t": "Ich esse das Brot@pao."
       },
       {
        "pt": "Bebo a água e como a maçã.",
        "t": "Ich trinke das Wasser@agua und esse den Apfel@maca."
       },
       {
        "pt": "O queijo e o pão estão na mochila.",
        "t": "Der Käse@queijo und das Brot@pao sind im Rucksack@mochila."
       },
       {
        "pt": "O martelo e a corda estão sobre o pergaminho.",
        "t": "Der Hammer@martelo und das Seil@corda liegen auf der Schriftrolle@pergaminho."
       },
       {
        "pt": "No castelo há a coroa e o anel.",
        "t": "Im Schloss@castelo liegen die Krone@coroa und der Ring@anel."
       }
      ],
      "ja": [
       {
        "pt": "Eu como o pão.",
        "t": "パン@pao を 食べる。"
       },
       {
        "pt": "Bebo a água e como a maçã.",
        "t": "水@agua を 飲んで 林檎@maca を 食べる。"
       },
       {
        "pt": "O queijo e o pão estão na mochila.",
        "t": "チーズ@queijo と パン@pao は リュック@mochila の 中 に ある。"
       },
       {
        "pt": "O martelo e a corda estão sobre o pergaminho.",
        "t": "金槌@martelo と 縄@corda は 巻物@pergaminho の 上 に ある。"
       },
       {
        "pt": "No castelo há a coroa e o anel.",
        "t": "城@castelo に 王冠@coroa と 指輪@anel が ある。"
       }
      ]
     }
    },
    "beats": {
     "1": {
      "title": "A Escada de Pedra",
      "text": "A Torre apagou o que você carregava, mas a mochila continua leve e as palavras continuam suas. O segundo andar é uma vila inteira: as janelas estão acesas, mas ninguém sabe pedir {o|pao}. O povo esqueceu o nome da fome."
     },
     "2": {
      "title": "O Baú da Taverna",
      "text": "Na taverna vazia, {o|bau} do ferreiro guarda um elmo. Sobre a mesa, {a|maca} mordida e {o|queijo} duro esperam um nome há séculos."
     },
     "3": {
      "title": "Ladrões na Despensa",
      "text": "Criaturas saqueiam a despensa e trocam {a|moeda} por nomes roubados. Devolva cada nome e elas largam o saque."
     },
     "4": {
      "title": "A Ponte de Corda",
      "text": "Uma ponte de {a|corda} balança sobre o poço. Do outro lado, algo mexe nas tábuas. Atravesse dizendo o nome de cada coisa."
     },
     "5": {
      "title": "O Cofre do Ferreiro",
      "text": "Sob o balcão, {o|martelo} ainda quente guarda um baú selado. Dentro dorme uma capa de lã grossa. Falta só a {a|chave} certa: o nome dela."
     },
     "6": {
      "title": "A Fonte da Praça",
      "text": "Na praça, a fonte ainda jorra {a|agua} limpa. Você bebe, descansa e relê {o|livro} que Ascolto carrega na asa."
     },
     "7": {
      "title": "O Guardião do Mercado",
      "text": "Entre as barracas, um guardião pesa cada nome como se fosse ouro. Pague com as palavras certas."
     },
     "8": {
      "title": "O Pergaminho do Prefeito",
      "text": "Na prefeitura, {o|pergaminho} amarelado lacra o baú do escudo da vila. O prefeito esqueceu o próprio nome, e só você pode devolvê-lo."
     },
     "9": {
      "title": "A Porta do Castelo",
      "text": "Um mago de elite defende a porta de {o|castelo} do rei. Atrás dela, {a|coroa} e {o|anel} brilham como promessas."
     },
     "10": {
      "title": "O Rei Goblin",
      "text": "O Rei Goblin ergue {a|coroa} roubada e segura a Página da Fome. Diga os nomes do povo e arranque dele o trono."
     },
     "win": {
      "title": "A Segunda Página",
      "text": "O Rei Goblin se desfaz, e a vila volta a pedir {o|pao} pelo nome. A Página da Fome se junta à primeira. Do alto da Torre desce um cheiro de enxofre."
     }
    }
   },
   {
    "id": 4,
    "region": {
     "name": "Vulcão do Sol",
     "emoji": "🌋",
     "floor": "Andar 3",
     "accent": "#ff7a45",
     "bg": "assets/bg/vulcao.jpg",
     "page": "a Página do Sol"
    },
    "song": {
     "it": {
      "title": "Sole di Fuoco",
      "artist": "Artista de exemplo"
     },
     "de": {
      "title": "Feuer der Sonne",
      "artist": "Artista de exemplo"
     },
     "ja": {
      "title": "太陽の炎",
      "artist": "Artista de exemplo"
     }
    },
    "monsters": {
     "minion": [
      "slime-fogo",
      "esqueleto-arqueiro",
      "golem"
     ],
     "elite": [
      "esqueleto"
     ],
     "boss": "golem-de-fogo"
    },
    "words": [
     {
      "item": "raio",
      "src": "caca"
     },
     {
      "item": "dragao",
      "src": "caca"
     },
     {
      "item": "gema",
      "src": "cards"
     },
     {
      "item": "armadura",
      "src": "cards"
     },
     {
      "item": "escudo",
      "src": "cards"
     },
     {
      "item": "capacete",
      "src": "cards"
     },
     {
      "item": "fenix",
      "src": "letra"
     },
     {
      "item": "mago",
      "src": "letra"
     },
     {
      "item": "unicornio",
      "src": "letra"
     }
    ],
    "boss": {
     "lines": {
      "it": [
       {
        "pt": "O sol brilha.",
        "t": "Il sole@sol brilla."
       },
       {
        "pt": "O dragão guarda o tesouro.",
        "t": "Il drago@dragao custodisce il tesoro@tesouro."
       },
       {
        "pt": "O raio acerta o escudo.",
        "t": "Il fulmine@raio colpisce lo scudo@escudo."
       },
       {
        "pt": "Visto a armadura e o capacete e pego o arco.",
        "t": "Indosso l'armatura@armadura e l'elmo@capacete e prendo l'arco@arco."
       },
       {
        "pt": "O mago vê a fênix e o unicórnio.",
        "t": "Il mago@mago vede la fenice@fenix e l'unicorno@unicornio."
       }
      ],
      "de": [
       {
        "pt": "O sol brilha.",
        "t": "Die Sonne@sol scheint."
       },
       {
        "pt": "O dragão guarda o tesouro.",
        "t": "Der Drache@dragao bewacht den Schatz@tesouro."
       },
       {
        "pt": "O raio acerta o escudo.",
        "t": "Der Blitz@raio trifft den Schild@escudo."
       },
       {
        "pt": "Visto a armadura e o capacete e pego o arco.",
        "t": "Ich trage die Rüstung@armadura und den Helm@capacete und nehme den Bogen@arco."
       },
       {
        "pt": "O mago vê a fênix e o unicórnio.",
        "t": "Der Zauberer@mago sieht den Phönix@fenix und das Einhorn@unicornio."
       }
      ],
      "ja": [
       {
        "pt": "O sol brilha.",
        "t": "太陽@sol が 輝く。"
       },
       {
        "pt": "O dragão guarda o tesouro.",
        "t": "竜@dragao は 宝@tesouro を 守る。"
       },
       {
        "pt": "O raio acerta o escudo.",
        "t": "雷@raio が 盾@escudo に 当たる。"
       },
       {
        "pt": "Visto a armadura e o capacete e pego o arco.",
        "t": "鎧@armadura と 兜@capacete を 着て 弓@arco を 持つ。"
       },
       {
        "pt": "O mago vê a fênix e o unicórnio.",
        "t": "魔法使い@mago は 不死鳥@fenix と 一角獣@unicornio を 見る。"
       }
      ]
     }
    },
    "beats": {
     "1": {
      "title": "A Escada de Cinzas",
      "text": "No terceiro andar, {o|sol} é uma bola de brasa presa no teto e o chão estala sob as botas. Ascolto avisa: «Aqui o Livro tem cheiro de fumaça. Fale baixo, fale certo.»"
     },
     "2": {
      "title": "O Baú de Brasas",
      "text": "Entre rochas quentes, {o|bau} guarda {o|capacete} dos antigos guerreiros, que nunca esquenta. Só se abre com o nome certo."
     },
     "3": {
      "title": "Criaturas de Lava",
      "text": "Criaturas de lava rastejam pela trilha. Cada uma engoliu o nome de {a|gema} que caiu da parede. Devolva os nomes."
     },
     "4": {
      "title": "A Trilha do Trovão",
      "text": "{O|raio} racha o céu da caverna e acende a trilha. A criatura à frente se alimenta do estrondo. Responda antes do próximo trovão."
     },
     "5": {
      "title": "O Arsenal Abandonado",
      "text": "Num arsenal esquecido, {o|arco} quebrado e {a|armadura} enferrujada rodeiam um baú. O cadeado pede o nome da proteção."
     },
     "6": {
      "title": "O Lago Quieto",
      "text": "Um lago de vapor suave. Você descansa, e um {o|mago} muito velho passa do outro lado, murmurando nomes que ninguém mais lembra."
     },
     "7": {
      "title": "O Guarda de Pedra",
      "text": "Uma criatura cheia de fumaça fecha o corredor. Cada nome certo racha uma de suas placas."
     },
     "8": {
      "title": "O Escudo do Mago",
      "text": "Na toca do mago, {o|escudo} reluz sobre um baú. {A|fenix} entalhada na tampa parece dizer: «Nomeie-me, e eu renasço.»"
     },
     "9": {
      "title": "A Câmara do Tesouro",
      "text": "Um guerreiro de ossos vigia a câmara de {o|tesouro}. Cada passo seu faz tremer o chão, mas você já carrega quase tudo de que precisa."
     },
     "10": {
      "title": "O Golem de Fogo",
      "text": "O Golem de Fogo ruge ao lado da Página do Sol. Sob a luz de {o|sol} e de {o|raio}, diga os nomes que ele esqueceu."
     },
     "win": {
      "title": "A Terceira Página",
      "text": "O golem desaba em brasas, e a Página do Sol se junta às outras duas. No canto, {o|unicornio} de luz olha para o alto e treme. Duas asas imensas encobrem {o|sol}. Babel despertou."
     }
    }
   }
  ]
 }
};
