const puppeteer = require('puppeteer');
const CREDS = require('./tokens');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    })

    const refillPage = await browser.newPage()
    await prepareRefillForm(refillPage);

    const emailPage = await browser.newPage()
    const smsCode = await getSmsCode(emailPage);

    // Вводим код из смс
    await refillPage.waitForSelector("input[name='otp']");
    await refillPage.type("input[name='otp']", smsCode, { delay: 50 });
    await refillPage.click("#offerCB");
    await refillPage.click("#ok");
    await refillPage.waitForNavigation({
        waitUntil: 'networkidle0',
    });

    browser.close()
})()

/*///////////////////////////////////////////
 * Входим на портал и заполняем заявку на оплату до кода СМС.
*////////////////////////////////////////////
async function prepareRefillForm(page) {
    await page.goto('https://portal.tpu.ru/desktop/student/oplata');

    // Авторизируемся на Портале ТПУ
    await page.waitForSelector("[name='password']", { visible: true, timeout: 0 });
    await page.type("[name='ssousername']", CREDS.TPU_USER);
    await page.keyboard.press('Tab');
    await page.keyboard.type(CREDS.TPU_PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });

    // Входим на страницу оплаты интернета
    await page.evaluate(() => {
        const btns = [...document.querySelector('#gpb_oplata').querySelectorAll('a')];
        btns.forEach((btn) => (btn.innerText === 'Связь') && btn.click());
    });
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });

    // Заполняем сумму - примерно на день
    await page.evaluate(() => {
        const sumInput = document.getElementById("summa");
        sumInput.value = "31"; // debug
        const monthlyFill = Math.trunc(sumInput.value / 30);
        sumInput.value = monthlyFill;

        document.getElementById("soglasie").checked = true;

        document.getElementById("oplata").click();
    });
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });

    // Вводим данные карты
    await page.waitForSelector("#pan", { visible: true, timeout: 0 });
    await page.type("#pan", CREDS.CARD_NUMBER, { delay: 50 });
    await page.keyboard.press('Tab');
    await page.keyboard.type(CREDS.CARD_MONTH);
    await page.keyboard.press('Tab');
    await page.keyboard.type(CREDS.CARD_YEAR);
    await page.keyboard.press('Tab');
    await page.keyboard.type(CREDS.CARD_CVC);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });

    // Соглашаемся и получаем СМС
    await page.waitForSelector('#agree');
    await page.click("#agree");
    await page.keyboard.press('Enter');
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });
}

///////////////////////////////////////////////////
// Входим на сайт почты и получаем пришедший код из СМС.
///////////////////////////////////////////////////
async function getSmsCode(page) {
    await page.goto('https://mail2.tpu.ru/rcmail/?_task=logout'); // От переадресации на общий вход.

    // Авторизируемся
    await page.waitForSelector("#rcmloginuser", { visible: true, timeout: 0 });
    await page.type("#rcmloginuser", CREDS.TPU_USER);
    await page.keyboard.press('Tab');
    await page.keyboard.type(CREDS.TPU_PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });

    // Ждем письмо
    await page.waitForSelector("tr.unread", { visible: true, timeout: 0 })
    page.evaluate('setInterval(() => document.querySelector(".button.checkmail").click(), 1000)')
    const dailySubject = 'MS-' + new Date().getDate()
    await page.waitForFunction(
        `document.querySelector("tr.unread").querySelector("a").innerText === "${dailySubject}"`
    )
    await page.click("tr.unread")

    // Получаем код
    const elementHandle = await page.$('iframe#messagecontframe');
    const frame = await elementHandle.contentFrame();
    await frame.waitForSelector("#messagebody", { visible: true, timeout: 0 })
    const code = await frame.$eval("#messagebody", msg => msg.innerText.trim())

    return code;
}