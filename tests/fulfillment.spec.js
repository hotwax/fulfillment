const { test, expect, chromium} = require('@playwright/test');
const fs = require('fs');

// Create a writable stream for logging
const logFile = fs.createWriteStream('playwright-logs.txt', { flags: 'a' });
const errorFile = fs.createWriteStream('playwright-errors.txt', { flags: 'a' });
const networkLogFile = fs.createWriteStream('network-logs.txt', { flags: 'a' });
const consoleLogFile = fs.createWriteStream('console-logs.txt', { flags: 'a' });

// Redirect console.log and console.error to the log files
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  logFile.write(args.join(' ') + '\n');
  originalLog.apply(console, args);
};

console.error = (...args) => {
  errorFile.write(args.join(' ') + '\n');
  originalError.apply(console, args);
};

test ('Fulfillment', async () => {
  test.setTimeout(8000000);

  //Set up the environment
  const browser = await chromium.launch(); 
  const context = await browser.newContext({headless: false, viewport: { width: 1380, height: 700 }});
  await context.tracing.start({ screenshots: true, snapshots: true }); // launch the browser in a visible window and set the visible portion of the web page within the browser window.
  const page = await context.newPage();

  page.on('request', request => {
    networkLogFile.write(`Request: ${request.method()} ${request.url()}\n`);
    if (request.postData()) {
      networkLogFile.write(`Post Data: ${request.postData()}\n`);
    }
  });

  page.on('response', response => {
    networkLogFile.write(`Response: ${response.status()} ${response.url()}\n`);
    response.text().then(text => {
      networkLogFile.write(`Response Body: ${text}\n`);
    }).catch(error => {
      networkLogFile.write(`Error reading response body: ${error}\n`);
    });
  });
  
  page.on('console', msg => {
    consoleLogFile.write(`Console Log: ${msg.type()} ${msg.text()}\n`);
    for (let i = 0; i < msg.args().length; ++i)
      consoleLogFile.write(`Console Log Arg[${i}]: ${msg.args()[i]}\n`);
  });
  // try-catch block for error handling
  try {
    
    // Go to URL and verify the heading
    await page.goto("https://launchpad.hotwax.io");
    await page.waitForTimeout(2000);
    const loginButton = '.ion-color.ion-color-danger.md.button.button-outline.ion-activatable.ion-focusable';
    if ((await page.isVisible(loginButton)) && (await page.isEnabled(loginButton))) await page.click(loginButton);
    await page.waitForTimeout(2000);
    await page.waitForSelector('.flex', { visible: true});
    await page.fill('input[name="instanceUrl"]', 'demo-oms');
    const instanceEnteredValue = await page.$eval('input[name="instanceUrl"]', instance => instance.value); 
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.fill('input[name="username"]','');
    const usernameEnteredValue = await page.$eval('input[name="username"]', username => username.value); 
    await page.locator('input[name="password"]').fill('');
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.waitForSelector('#app > ion-app > ion-router-outlet > div:nth-child(1) > ion-content > main', { visible: true});
    const appCard = await page.locator('ion-card:has-text("Fulfillment")');
    await appCard.locator('.ion-color.ion-color-medium.md.button.button-clear.in-buttons.button-has-icon-only.ion-activatable.ion-focusable').nth(1).click();
    await page.waitForSelector('.split-pane-side.md.menu-type-overlay.menu-side-start.menu-pane-visible.menu-enabled', { visible: true});
    await page.locator('ion-label:has-text("Settings")').click();
    await page.waitForSelector('.user-profile');

    const selectors = {
      usernameElement: 'div.user-profile ion-card-subtitle',
      instanceElement: '#main-content > div > ion-content > section:nth-child(3) > ion-card:nth-child(1) > ion-card-header > ion-card-title',
      appVersionElement: '.section-header div p.overline:nth-child(2)',
      buildDateTimeElement: '.section-header div p.overline:nth-child(1)'
    };
    const username = await page.locator(selectors.usernameElement).evaluate(element => element.textContent.trim());
    const instance = await page.locator(selectors.instanceElement).evaluate(element => element.textContent.trim());
    const appVersion = await page.locator(selectors.appVersionElement).evaluate(element => element.textContent.trim());
    const buildDateTime= await page.locator(selectors.buildDateTimeElement).evaluate(element => element.textContent.trim());
    if (instance && username && appVersion && buildDateTime) {
    await expect(username).toContain(usernameEnteredValue);
    await expect(instance).toContain(instanceEnteredValue);
    }
    await page.locator('#main-content > div > ion-content > section:nth-child(3) > ion-card:nth-child(3) > ion-item').click();
    await page.waitForSelector('.popover-viewport', { visible: true});
    let dropdownItems = await page.$$('.select-interface-option.md.sc-ion-select-popover-md.item.item-lines-default.item-fill-none.item-has-interactive-control.ion-activatable.ion-focusable');
    console.log(dropdownItems.length, 'facilities found');
    for (let i = 0; i < dropdownItems.length; i++) {
      await dropdownItems[i].evaluate(element => element.scrollIntoView());
      await page.waitForTimeout(2000);
      await dropdownItems[i].click();
      await page.waitForTimeout(2000);
      await page.locator('ion-label:has-text("Open")').click();
      await page.waitForTimeout(3000);
      if (await page.isVisible('.md.chip-outline.ion-activatable')){
        await page.waitForTimeout(2000);
        let orderCards = await page.$$('.md.chip-outline.ion-activatable');
        const orderCount = await page.locator('#main-content > div > ion-header > ion-toolbar > ion-title');
        const numberOfOrders = await orderCount.evaluate(element => {
         const getOrderValue =  element.childNodes[0].textContent; 
         const getOrderValue1 = getOrderValue.split(' ')[0];
         return getOrderValue1;});
        await expect (orderCards.length).toBe(Number(numberOfOrders));
        console.log(numberOfOrders, 'orders are visible');
        await page.locator('ion-buttons.buttons-last-slot.sc-ion-buttons-md-h.sc-ion-buttons-md-s.md ion-menu-button').click();
        await page.waitForSelector('div.ion-page div.menu-inner');
        const matchOrderNumber = await page.$eval('.radio-checked', element => element.textContent);
        //const matchOrderNumber1 = matchOrderNumber.split(' ')[0];
        await expect (matchOrderNumber).toContain(numberOfOrders.toString());
        await page.waitForTimeout(2000);
        const orderFilterOptions = await page.$$('.md.in-item.radio-justify-start.radio-alignment-center.radio-label-placement-end');
        let randomIndex = Math.floor(Math.random() * orderFilterOptions.length);
        const randomOption = orderFilterOptions[randomIndex];
        const filterOptionText = await randomOption.textContent();
        await randomOption.click();
        if (await page.isVisible('.ion-color.ion-color-light.md.item')) await page.click('.ion-color.ion-color-light.md.item');
        orderCards = await page.$$('.md.chip-outline.ion-activatable');
        await expect (filterOptionText).toContain(orderCards.length.toString());
        await page.waitForTimeout(2000);
      
        while (await page.isVisible('.md.chip-outline.ion-activatable')){ 
          await page.locator('.md.chip-outline.ion-activatable').nth(0).click();
          await page.waitForTimeout(2000); 
          await page.locator('ion-item:has-text("Pick order")').click();
          await page.waitForTimeout(4000);
          await page.locator('ion-item:has-text("Copy ID")').click();
          await page.waitForTimeout(4000);
          const pickerList = await page.$$('.item.md.item-lines-default.item-fill-none.item-has-interactive-control.in-list.ion-activatable.ion-focusable.item-label');
          randomIndex = Math.floor(Math.random() * pickerList.length);
          const randomPicker = pickerList[randomIndex];
          await randomPicker.click();
          await page.waitForTimeout(2000); 
          await page.waitForSelector('ion-modal');
          const ionFabButton = await page.$('ion-modal > div > ion-fab > ion-fab-button');
          if (ionFabButton) {
            await ionFabButton.click(); 
          } else {
            console.log('Picklist not saved');
          }
          let newTabPopup = page.waitForEvent('popup');
          let newTab = await newTabPopup;
          await newTab.waitForLoadState();
          await page.waitForTimeout(4000);
          await newTab.close();
          await page.waitForTimeout(2000);
          await page.locator('ion-label:has-text("In Progress")').click();
          await page.waitForTimeout(2000);
          await page.locator('.searchbar-input.sc-ion-searchbar-md').click();
          await page.keyboard.press('Control+V');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);
          await page.locator('.md.button.button-solid.ion-activatable.ion-focusable').nth(0).click();
          await page.waitForSelector('.sc-ion-alert-md-h.sc-ion-alert-md-s.md');
          await page.waitForTimeout(2000);
          const packOptions = await page.locator('.alert-checkbox-label.sc-ion-alert-md');
          const count = await packOptions.count();
          for (let j = 0; j < count; j++) {
            await packOptions.nth(j).click();
            await page.waitForTimeout(2000);
          }
          await page.waitForTimeout(2000);
          await page.locator('.alert-button.ion-focusable.ion-activatable.alert-button-role-confirm.sc-ion-alert-md').click();
          newTabPopup = page.waitForEvent('popup');
          newTab = await newTabPopup;
          await newTab.waitForLoadState();
          await page.waitForTimeout(4000);
          await newTab.close();
          await page.waitForTimeout(2000);
          await page.locator('ion-label:has-text("Completed")').click();
          await page.waitForTimeout(3000);
          await page.locator('.searchbar-input.sc-ion-searchbar-md').click();
          await page.keyboard.press('Control+V');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(3000);
          await page.locator('.md.button.button-solid.ion-activatable.ion-focusable').nth(0).click();
          await page.waitForTimeout(2000);
          await page.locator('ion-label:has-text("Open")').click();
          await page.waitForTimeout(2000);
        }
      } 
      if (i < dropdownItems.length-1) {
        console.log('change facility');
        await page.locator('ion-label:has-text("Settings")').click();
        await page.waitForTimeout(2000);
        await page.locator('#main-content > div > ion-content > section:nth-child(3) > ion-card:nth-child(3) > ion-item').click();
        await page.waitForTimeout(2000);
        dropdownItems = await page.$$('.select-interface-option.md.sc-ion-select-popover-md.item.item-lines-default.item-fill-none.item-has-interactive-control.ion-activatable.ion-focusable');
      }
    }
    await page.waitForTimeout(5000);
    console.log(appVersion); 
    console.log(buildDateTime);
    // await page.click(".button-solid.ion-activatable.ion-focusable");
    await page.waitForTimeout(3000);
  }
  catch (error) {
    // Log the error for debugging  
    console.error('Error:', error);  
  }
  finally {
    await context.tracing.stop({ path: 'trace.zip' });
    await page.close();
    await browser.close();
    logFile.end();
    errorFile.end();
    networkLogFile.end();
    consoleLogFile.end();
  }
});

    
