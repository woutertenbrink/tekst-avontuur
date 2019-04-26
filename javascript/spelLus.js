const { sleep, cls, color, print } = require("./basic");
const { voerActieUit, toegestaan } = require("./spelToestand");
const leesAvontuur = require("./leesAvontuur");
const stdin = process.stdin;

const input = prompt =>
  new Promise(resolve => {
    print(prompt + "? ");
    stdin.setRawMode(false);
    stdin.setEncoding("utf8");
    const callback = function(chunk) {
      resolve(chunk.slice(0, -1));

      stdin.setRawMode(true);
      stdin.setEncoding("utf8");
      stdin.removeListener("data", callback);
    };

    stdin.on("data", callback);
  });

let skip = false;
let keyPressed = null;
let naam = "";

const spelToestand = Array(100).fill(0);

const interpoleer = zin =>
  zin
    .replace(/\$n/g, naam)
    .replace(/#\d{2}/g, num => ` ${spelToestand[parseInt(num.slice(1), 10)]}`);

const tekst = async (verteller, zin) => {
  color(verteller);
  for (let i = 0; i < zin.length; i++) {
    print(zin[i]);
    await sleep(skip ? 0 : 0.04);
  }
  print("\n");
};

const toonGebeurtenis = async schermData => {
  let verteller = 2;
  skip = false;
  cls();

  for (let index = 0; index < schermData.length; index++) {
    let bewering = schermData[index];
    if (toegestaan(spelToestand, bewering)) {
      do {
        index++;
        const sentence = schermData[index];
        if (sentence[0] === "&") {
          // Einde en acties
          if (sentence.slice(1).length > 0) {
            voerActieUit(spelToestand, sentence.slice(1));
          }
        } else if (sentence[0] === "*") {
          // Opmaak
          const command = sentence[1];
          const data = sentence.slice(2);
          if (command === "c") {
            verteller = parseInt(data, 10);
          }
          if (command === "s") {
            await sleep(skip ? 0 : parseInt(data, 10));
          }
        } else {
          await tekst(verteller, interpoleer(sentence));
        }
      } while (!schermData[index].startsWith("&"));
    } else {
      do {
        index++;
      } while (!schermData[index].startsWith("&"));
    }
  }
  keyPressed = null;
};

const keypress = () =>
  new Promise(resolve => {
    let watcher = setInterval(() => {
      if (keyPressed !== null) {
        resolve(keyPressed);
        keyPressed = null;
        clearInterval(watcher);
      }
    }, 100);
  });

const toonActies = async actieData => {
  const acties = [];
  let verteller = 2;
  let bewering;

  for (let index = 0; index < actieData.length; index++) {
    bewering = actieData[index];
    if (toegestaan(spelToestand, bewering)) {
      acties.push({ naam: actieData[index + 1], actie: actieData[index + 2] });
    }
    index += 2;
  }

  color(7);
  acties.forEach((actie, i) => console.log(`${i + 1} ) ${actie.naam}`));
  if (acties.length === 0) {
    return false;
  }

  let toets;
  let keuze;
  do {
    toets = await keypress();
    keuze = toets && /\d/.test(toets) && parseInt(toets, 10);
  } while (!(keuze > 0 && keuze <= acties.length));

  voerActieUit(spelToestand, acties[keuze - 1].actie);
  return true;
};

const spelLus = async bestandsNaam => {
  stdin.resume();
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");

  stdin.on("data", function(key) {
    // ctrl-c ( end of text )
    if (key === "\u0003" || key === "\u001b") {
      cls();
      color(7);
      print("Bedankt voor het spelen!\n");

      process.exit();
    }
    if (key === "\u0020") {
      skip = true;
    }
    keyPressed = key;
  });

  cls();
  print("Hallo avonturier!\n");
  print("\n");
  naam = await input("Wat is je naam");

  const data = await leesAvontuur(bestandsNaam);

  let heeftActies = true;

  do {
    await toonGebeurtenis(data.schermData);
    heeftActies = await toonActies(data.actieData);
  } while (heeftActies);
  process.exit(0);
};

module.exports = spelLus;