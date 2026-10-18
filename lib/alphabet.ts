// Alfabeto e sons difíceis para brasileiros, por idioma.
// say: o que a voz do app fala (o nome da letra no idioma).
// accept: o que o reconhecimento de voz pode devolver e ainda conta como certo.
// pt: dica de pronúncia escrita "do jeito brasileiro".

export type Letter = { l: string; say: string; accept: string[]; pt: string; ex: [string, string] };
export type Sound = { id: string; title: string; pt: string; ex: [string, string][] };

const IT_LETTERS: Letter[] = [
  { l: 'A', say: 'a', accept: ['a'], pt: '"á", sempre aberto', ex: ['amore', 'amor'] },
  { l: 'B', say: 'bi', accept: ['bi', 'b'], pt: '"bí"', ex: ['bello', 'bonito'] },
  { l: 'C', say: 'ci', accept: ['ci', 'c'], pt: '"tchí"', ex: ['ciao', 'oi / tchau'] },
  { l: 'D', say: 'di', accept: ['di', 'd'], pt: '"dí" (sem virar "dji")', ex: ['dolce', 'doce'] },
  { l: 'E', say: 'e', accept: ['e'], pt: '"ê" ou "é"', ex: ['estate', 'verão'] },
  { l: 'F', say: 'effe', accept: ['effe', 'f'], pt: '"éffe"', ex: ['fiore', 'flor'] },
  { l: 'G', say: 'gi', accept: ['gi', 'g'], pt: '"djí"', ex: ['gelato', 'sorvete'] },
  { l: 'H', say: 'acca', accept: ['acca', 'h'], pt: '"áca" — e é sempre muda nas palavras', ex: ['hotel', 'hotel (o h não soa)'] },
  { l: 'I', say: 'i', accept: ['i'], pt: '"í"', ex: ['isola', 'ilha'] },
  { l: 'L', say: 'elle', accept: ['elle', 'l'], pt: '"élle", com L de verdade no fim da sílaba', ex: ['luna', 'lua'] },
  { l: 'M', say: 'emme', accept: ['emme', 'm'], pt: '"émme"', ex: ['mare', 'mar'] },
  { l: 'N', say: 'enne', accept: ['enne', 'n'], pt: '"énne"', ex: ['notte', 'noite'] },
  { l: 'O', say: 'o', accept: ['o'], pt: '"ô" ou "ó"', ex: ['oggi', 'hoje'] },
  { l: 'P', say: 'pi', accept: ['pi', 'p'], pt: '"pí"', ex: ['pane', 'pão'] },
  { l: 'Q', say: 'cu', accept: ['cu', 'qu', 'q'], pt: '"cú"', ex: ['quando', 'quando'] },
  { l: 'R', say: 'erre', accept: ['erre', 'r'], pt: '"érre", com o R vibrado na ponta da língua', ex: ['rosa', 'rosa'] },
  { l: 'S', say: 'esse', accept: ['esse', 's'], pt: '"ésse"', ex: ['sole', 'sol'] },
  { l: 'T', say: 'ti', accept: ['ti', 't'], pt: '"tí" (sem virar "tchi")', ex: ['tempo', 'tempo'] },
  { l: 'U', say: 'u', accept: ['u'], pt: '"ú"', ex: ['uva', 'uva'] },
  { l: 'V', say: 'vu', accept: ['vu', 'vi', 'v'], pt: '"vú"', ex: ['vino', 'vinho'] },
  { l: 'Z', say: 'zeta', accept: ['zeta', 'z'], pt: '"dzéta"', ex: ['zucchero', 'açúcar'] },
  { l: 'J', say: 'i lunga', accept: ['i lunga', 'ilunga', 'j'], pt: '"í lunga" (só em palavras estrangeiras)', ex: ['jeans', 'jeans'] },
  { l: 'K', say: 'cappa', accept: ['cappa', 'kappa', 'k'], pt: '"cápa" (estrangeira)', ex: ['koala', 'coala'] },
  { l: 'W', say: 'doppia vu', accept: ['doppia vu', 'doppiavu', 'doppia v', 'w'], pt: '"dóppia vú" (estrangeira)', ex: ['weekend', 'fim de semana'] },
  { l: 'X', say: 'ics', accept: ['ics', 'x'], pt: '"ics" (estrangeira)', ex: ['taxi', 'táxi'] },
  { l: 'Y', say: 'ipsilon', accept: ['ipsilon', 'y'], pt: '"ípsilon" (estrangeira)', ex: ['yogurt', 'iogurte'] },
];

const IT_SOUNDS: Sound[] = [
  { id: 'ce', title: 'ce · ci', pt: 'C antes de E ou I soa "tch": ciao = "tchao".', ex: [['ciao', 'oi / tchau'], ['cena', 'jantar'], ['cielo', 'céu']] },
  { id: 'che', title: 'che · chi', pt: 'Com H no meio, volta a ser "k": chi = "ki".', ex: [['perché', 'por que'], ['chiave', 'chave'], ['anche', 'também']] },
  { id: 'ge', title: 'ge · gi', pt: 'G antes de E ou I soa "dj": gelato = "djelato".', ex: [['gelato', 'sorvete'], ['giorno', 'dia'], ['gente', 'gente']] },
  { id: 'ghe', title: 'ghe · ghi', pt: 'Com H no meio, G duro, como em "guerra": spaghetti = "spaguetti".', ex: [['spaghetti', 'espaguete'], ['ghiaccio', 'gelo'], ['laghi', 'lagos']] },
  { id: 'gli', title: 'gli', pt: 'Soa como o nosso LH: famiglia = "família" com LH.', ex: [['famiglia', 'família'], ['figlio', 'filho'], ['voglio', 'eu quero']] },
  { id: 'gn', title: 'gn', pt: 'Soa como o nosso NH: bagno = "banho".', ex: [['bagno', 'banheiro'], ['sogno', 'sonho'], ['gnocchi', 'nhoque']] },
  { id: 'sce', title: 'sce · sci', pt: 'Soa como o nosso X/CH: pesce = "pexe".', ex: [['pesce', 'peixe'], ['uscire', 'sair'], ['scena', 'cena']] },
  { id: 'sche', title: 'sca · sche · schi', pt: 'Soa "sk": scuola = "skuola".', ex: [['scuola', 'escola'], ['schiena', 'costas'], ['pesche', 'pêssegos']] },
  { id: 'z', title: 'z', pt: 'Soa "ts" ou "dz", nunca como o nosso Z: pizza = "pitsa".', ex: [['pizza', 'pizza'], ['zio', 'tio'], ['grazie', 'obrigado']] },
  { id: 'doppie', title: 'Consoantes dobradas', pt: 'Duas letras iguais = segure o som um instante a mais. Muda o sentido!', ex: [['nonno', 'avô'], ['nono', 'nono'], ['palla', 'bola'], ['pala', 'pá']] },
  { id: 'r', title: 'R vibrado', pt: 'Sempre na ponta da língua, como "caro" dito no interior de SP. Nunca o R de "rato".', ex: [['Roma', 'Roma'], ['terra', 'terra'], ['amore', 'amor']] },
  { id: 'h', title: 'H mudo', pt: 'O H não soa: ho = "ó", hanno = "ánno".', ex: [['ho', 'eu tenho'], ['hai', 'você tem'], ['hanno', 'eles têm']] },
  { id: 'tidi', title: 'ti · di', pt: 'T e D não viram "tchi" e "dji" como no Brasil: tipo = "tí-po".', ex: [['tipo', 'tipo'], ['dico', 'eu digo'], ['notte', 'noite']] },
];

const DE_LETTERS: Letter[] = [
  { l: 'A', say: 'a', accept: ['a'], pt: '"á"', ex: ['Apfel', 'maçã'] },
  { l: 'B', say: 'be', accept: ['be', 'b'], pt: '"bê"', ex: ['Baum', 'árvore'] },
  { l: 'C', say: 'Zeh', accept: ['zeh', 'ce', 'c', 'tse'], pt: '"tsê"', ex: ['Computer', 'computador'] },
  { l: 'D', say: 'de', accept: ['de', 'd'], pt: '"dê"', ex: ['danke', 'obrigado'] },
  { l: 'E', say: 'e', accept: ['e'], pt: '"ê"', ex: ['Essen', 'comida'] },
  { l: 'F', say: 'ef', accept: ['ef', 'f'], pt: '"éf"', ex: ['Frau', 'mulher'] },
  { l: 'G', say: 'ge', accept: ['ge', 'g'], pt: '"guê" (sempre duro)', ex: ['gut', 'bom'] },
  { l: 'H', say: 'ha', accept: ['ha', 'h'], pt: '"rá" com R aspirado, como em "rato" bem suave', ex: ['Haus', 'casa'] },
  { l: 'I', say: 'i', accept: ['i'], pt: '"í"', ex: ['Igel', 'ouriço'] },
  { l: 'J', say: 'jot', accept: ['jot', 'j', 'yot'], pt: '"iót" (o J alemão soa como I)', ex: ['ja', 'sim'] },
  { l: 'K', say: 'ka', accept: ['ka', 'k'], pt: '"cá"', ex: ['Kind', 'criança'] },
  { l: 'L', say: 'el', accept: ['el', 'l'], pt: '"él"', ex: ['Liebe', 'amor'] },
  { l: 'M', say: 'em', accept: ['em', 'm'], pt: '"ém"', ex: ['Mutter', 'mãe'] },
  { l: 'N', say: 'en', accept: ['en', 'n'], pt: '"én"', ex: ['Nacht', 'noite'] },
  { l: 'O', say: 'o', accept: ['o'], pt: '"ô"', ex: ['Oma', 'vovó'] },
  { l: 'P', say: 'pe', accept: ['pe', 'p'], pt: '"pê"', ex: ['Papa', 'papai'] },
  { l: 'Q', say: 'ku', accept: ['ku', 'q', 'kuh'], pt: '"cú"', ex: ['bequem', 'confortável'] },
  { l: 'R', say: 'er', accept: ['er', 'r'], pt: '"ér", com R lá no fundo da garganta', ex: ['rot', 'vermelho'] },
  { l: 'S', say: 'es', accept: ['es', 's'], pt: '"és"', ex: ['Sonne', 'sol'] },
  { l: 'T', say: 'te', accept: ['te', 't'], pt: '"tê"', ex: ['Tag', 'dia'] },
  { l: 'U', say: 'u', accept: ['u'], pt: '"ú"', ex: ['Uhr', 'relógio'] },
  { l: 'V', say: 'vau', accept: ['vau', 'fau', 'v'], pt: '"fáu" (o V alemão soa como F)', ex: ['Vater', 'pai'] },
  { l: 'W', say: 'we', accept: ['we', 'w', 'weh'], pt: '"vê" (o W alemão soa como V)', ex: ['Wasser', 'água'] },
  { l: 'X', say: 'ix', accept: ['ix', 'x', 'iks'], pt: '"iks"', ex: ['Xylofon', 'xilofone'] },
  { l: 'Y', say: 'ypsilon', accept: ['ypsilon', 'y'], pt: '"üpsilon"', ex: ['Yoga', 'ioga'] },
  { l: 'Z', say: 'zet', accept: ['zet', 'z', 'zett'], pt: '"tsét" (o Z alemão soa como TS)', ex: ['Zeit', 'tempo'] },
  { l: 'Ä', say: 'ä', accept: ['ä', 'a umlaut', 'ae'], pt: '"é" aberto', ex: ['Mädchen', 'menina'] },
  { l: 'Ö', say: 'ö', accept: ['ö', 'o umlaut', 'oe'], pt: 'boca de "ô" dizendo "ê"', ex: ['schön', 'bonito'] },
  { l: 'Ü', say: 'ü', accept: ['ü', 'u umlaut', 'ue'], pt: 'boca de "ú" dizendo "í"', ex: ['Tür', 'porta'] },
  { l: 'ß', say: 'eszett', accept: ['eszett', 'scharfes s', 'ß'], pt: '"és-tsét" — soa como SS', ex: ['Straße', 'rua'] },
];

const DE_SOUNDS: Sound[] = [
  { id: 'ei', title: 'ei', pt: 'Soa "ai": mein = "main".', ex: [['mein', 'meu'], ['Zeit', 'tempo'], ['eins', 'um']] },
  { id: 'ie', title: 'ie', pt: 'Soa "í" comprido: Liebe = "líibe".', ex: [['Liebe', 'amor'], ['viel', 'muito'], ['Bier', 'cerveja']] },
  { id: 'eu', title: 'eu · äu', pt: 'Soa "ói": neu = "nói".', ex: [['neu', 'novo'], ['heute', 'hoje'], ['Häuser', 'casas']] },
  { id: 'ich', title: 'ch suave (ich)', pt: 'Depois de e, i, ä, ö, ü: um chiado suave, como gato bravo "hhh" com a língua alta.', ex: [['ich', 'eu'], ['nicht', 'não'], ['Milch', 'leite']] },
  { id: 'ach', title: 'ch raspado (ach)', pt: 'Depois de a, o, u: raspado no fundo, como o R de "carro" carioca.', ex: [['Nacht', 'noite'], ['Buch', 'livro'], ['auch', 'também']] },
  { id: 'sch', title: 'sch', pt: 'Soa como o nosso X/CH: Schule = "xule".', ex: [['Schule', 'escola'], ['schön', 'bonito'], ['Tisch', 'mesa']] },
  { id: 'spst', title: 'sp · st no começo', pt: 'No começo da palavra: "xp" e "xt": Sport = "xpórt".', ex: [['Sport', 'esporte'], ['Stadt', 'cidade'], ['sprechen', 'falar']] },
  { id: 'ig', title: '-ig no fim', pt: 'Termina com o ch suave: richtig = "ríchtich".', ex: [['richtig', 'certo'], ['König', 'rei'], ['zwanzig', 'vinte']] },
  { id: 'final', title: 'Consoante no fim endurece', pt: 'No fim da palavra, D vira T, B vira P e G vira K: Hund = "hunt".', ex: [['Hund', 'cachorro'], ['gelb', 'amarelo'], ['Tag', 'dia']] },
  { id: 'er', title: '-er no fim', pt: 'Soa quase "a": Vater = "fáta".', ex: [['Vater', 'pai'], ['aber', 'mas'], ['Bruder', 'irmão']] },
  { id: 'wv', title: 'w · v', pt: 'W soa V, e V soa F: Wasser = "vásser", Vater = "fáta".', ex: [['Wasser', 'água'], ['wir', 'nós'], ['viel', 'muito']] },
  { id: 'z', title: 'z · tz', pt: 'Sempre "ts": Zeit = "tsait".', ex: [['Zeit', 'tempo'], ['zehn', 'dez'], ['Katze', 'gato']] },
  { id: 'umlaut', title: 'ä · ö · ü', pt: 'Ö: boca de "ô" dizendo "ê". Ü: boca de "ú" dizendo "í". Ä: "é" aberto.', ex: [['schön', 'bonito'], ['Tür', 'porta'], ['Mädchen', 'menina']] },
  { id: 'h', title: 'h depois de vogal', pt: 'Não soa: só deixa a vogal comprida. Sohn = "zôon".', ex: [['Sohn', 'filho'], ['gehen', 'ir'], ['Uhr', 'relógio']] },
  { id: 's', title: 's antes de vogal', pt: 'No começo, antes de vogal, soa "z": Sonne = "zóne".', ex: [['Sonne', 'sol'], ['sieben', 'sete'], ['Rose', 'rosa']] },
  { id: 'pf', title: 'pf', pt: 'P e F juntos, rapidinho: Apfel = "ápfel".', ex: [['Apfel', 'maçã'], ['Pferd', 'cavalo'], ['Kopf', 'cabeça']] },
  { id: 'tsch', title: 'tsch · qu', pt: 'tsch = "tch"; qu = "kv": bequem = "bekvém".', ex: [['Deutsch', 'alemão'], ['tschüss', 'tchau'], ['bequem', 'confortável']] },
];

export const ALPHABET: Record<string, { letters: Letter[]; sounds: Sound[] }> = {
  it: { letters: IT_LETTERS, sounds: IT_SOUNDS },
  de: { letters: DE_LETTERS, sounds: DE_SOUNDS },
};
