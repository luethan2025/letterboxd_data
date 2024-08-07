const { Command, Option } = require("commander");
const fs = require("fs");
const path = require("path");
const process = require("process");
const { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } = require("puppeteer");
const puppeteer = require("puppeteer-extra");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");

(async () => {
  const APPLICATION = "letterboxd_data";

  // command-line argument for destination directory
  const DEFAULT_DEST_DIR_NAME = "data";
  const DIRECTORY_OPTION = new Option(
    "--path_to_dest_directory <string>",
    "path to destination directory relative to application root"
  ).default(path.join(".", DEFAULT_DEST_DIR_NAME));

  // command-line argument for destination file
  const DEFAULT_DEST_FILE_NAME = "data";
  const FILE_OPTION = new Option(
    "--dest_file <string>",
    "name of the destination file"
  ).default(`${DEFAULT_DEST_FILE_NAME}.txt`);

  const program = new Command();
  program.name(APPLICATION);
  program
    .requiredOption(
      "--url <string>",
      "URL to film's homepage on letterboxd.com"
    )
    .addOption(DIRECTORY_OPTION)
    .addOption(FILE_OPTION);
  program.parse(process.argv);

  const options = program.opts();
  const { url, path_to_dest_directory, dest_file } = options;

  // optionally enable Cooperative Mode for several request interceptors
  puppeteer.use(
    AdblockerPlugin({
      interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
    })
  );

  // XPath to select every file review on the page
  const xpath =
    "xpath/.//div[contains(@class, 'body-text -prose collapsible-text')]";

  puppeteer.launch({ headless: true }).then(async (browser) => {
    const page = await browser.newPage();
    const response = await page.goto(url, {
      waitUntil: "networkidle2"
    });
    const status = response.status();
    if (status !== 200) {
      console.log("Connection was unsuccessful. Try again at later");
      console.log("Closing browser and exiting");

      await browser.close();
      process.exit(0);
    }

    let idx = 1;
    let reviews = [];
    const data = [];
    do {
      const nextURL = `${url}/reviews/by/added/page/${idx}/`;
      console.log(`Navigating to ${nextURL}`);

      const response = await page.goto(nextURL, {
        waitUntil: "networkidle2"
      });
      const status = response.status();
      if (status !== 200) {
        console.log("Connection was unsuccessful. Try again at later");
        console.log("Closing browser and exiting");

        await browser.close();
        process.exit(0);
      }

      const elements = await page.$$(xpath);

      // evaluate selected elements
      const rawText = await Promise.all(
        elements.map(
          async (item) =>
            await (await item.getProperty("innerText")).jsonValue()
        )
      );

      // remove all newline characters and reformat text
      reviews = rawText.map((text) =>
        text.replace(/\n/g, " ").replace(/\s\s+/g, " ").trim()
      );
      data.push(...reviews);
      idx++;
    } while (reviews.length !== 0);

    // write data into the destination file
    if (data.length !== 0) {
      if (!fs.existsSync(path_to_dest_directory)) {
        fs.mkdirSync(path_to_dest_directory, { recursive: true });
        console.log(`Created ${path.basename(path_to_dest_directory)}`);
      } else {
        console.log(`${path.basename(path_to_dest_directory)} already exists`);
      }

      const dest = path.join(path_to_dest_directory, dest_file);
      console.log(`Writing data to ${dest_file}`);
      fs.writeFileSync(dest, reviews.join("\n"), { flag: "w" });
      console.log(`Finished writing data to ${dest_file}`);
    }

    console.log("Closing browser");
    await browser.close();
  });
})();
