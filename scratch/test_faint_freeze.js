import puppeteer from 'puppeteer';

(async () => {
  const TEST_ROOM = 'FAINT_TEST_ROOM_' + Date.now();
  console.log(`🚀 Launching Puppeteer Multi-Turn Faint Debugger (Room: ${TEST_ROOM})...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const pageA = await browser.newPage();
    const pageB = await browser.newPage();

    pageA.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('SOCKET') || txt.includes('ERROR') || txt.includes('faint')) console.log('🌐 [PAGE A]', txt);
    });
    pageB.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('SOCKET') || txt.includes('ERROR') || txt.includes('faint')) console.log('🌐 [PAGE B]', txt);
    });

    pageA.on('pageerror', err => console.error('❌ [PAGE A EXCEPTION]', err.message));
    pageB.on('pageerror', err => console.error('❌ [PAGE B EXCEPTION]', err.message));

    console.log('📱 Navigating to http://localhost:5173...');
    await pageA.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await pageB.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    console.log('👆 Selecting Table 09: PokeBattle...');
    await pageA.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Table 09'));
      if (btn) btn.click();
    });
    await pageB.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Table 09'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 800));

    console.log(`✍️ Entering Credentials User_A and User_B for room ${TEST_ROOM}...`);
    await pageA.evaluate((rm) => {
      const u = document.querySelector('input#username');
      const r = document.querySelector('input#room');
      const f = document.querySelector('form');
      if (u && r && f) {
        u.value = 'User_A';
        u.dispatchEvent(new Event('input', { bubbles: true }));
        r.value = rm;
        r.dispatchEvent(new Event('input', { bubbles: true }));
        f.requestSubmit();
      }
    }, TEST_ROOM);

    await pageB.evaluate((rm) => {
      const u = document.querySelector('input#username');
      const r = document.querySelector('input#room');
      const f = document.querySelector('form');
      if (u && r && f) {
        u.value = 'User_B';
        u.dispatchEvent(new Event('input', { bubbles: true }));
        r.value = rm;
        r.dispatchEvent(new Event('input', { bubbles: true }));
        f.requestSubmit();
      }
    }, TEST_ROOM);

    await new Promise(r => setTimeout(r, 1200));

    console.log('⚔️ Selecting 대전 (선택) Mode...');
    await pageA.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pvpBtn = btns.find(b => b.textContent.includes('대전 (선택)'));
      if (pvpBtn) pvpBtn.click();
    });

    await pageB.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pvpBtn = btns.find(b => b.textContent.includes('대전 (선택)'));
      if (pvpBtn) pvpBtn.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    console.log('🎯 Clicking 🎲 무작위 추첨 to pick 3 Pokemon...');
    await pageA.evaluate(() => {
      const randBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('무작위 추첨'));
      if (randBtn) randBtn.click();
    });

    await pageB.evaluate(() => {
      const randBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('무작위 추첨'));
      if (randBtn) randBtn.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log('📤 Clicking ⚔️ 대전 엔트리 제출...');
    await pageA.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('엔트리 제출'));
      if (submitBtn) submitBtn.click();
    });

    await pageB.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('엔트리 제출'));
      if (submitBtn) submitBtn.click();
    });

    console.log('⏳ Waiting for Battle Arena to load...');
    await pageA.waitForSelector('.move-btn', { timeout: 10000 });
    await pageB.waitForSelector('.move-btn', { timeout: 10000 });
    console.log('✅ Battle Arena Started!');

    const printState = async (turnNum) => {
      const stateA = await pageA.evaluate(() => {
        const hud = document.querySelector('div[style*="Consolas"]');
        return hud ? hud.innerText.replace(/\n/g, ' | ') : 'NO HUD';
      });
      const stateB = await pageB.evaluate(() => {
        const hud = document.querySelector('div[style*="Consolas"]');
        return hud ? hud.innerText.replace(/\n/g, ' | ') : 'NO HUD';
      });
      console.log(`\n📊 [TURN ${turnNum} PAGE A STATE]:`, stateA);
      console.log(`📊 [TURN ${turnNum} PAGE B STATE]:`, stateB);
    };

    // Run up to 6 attack turns until Pokemon faints
    for (let turnNum = 1; turnNum <= 6; turnNum++) {
      console.log(`\n--- EXECUTING TURN ${turnNum} ---`);
      await printState(turnNum);

      // Check if result screen is reached
      const isResultA = await pageA.evaluate(() => !!document.querySelector('.excel-result-card'));
      const isResultB = await pageB.evaluate(() => !!document.querySelector('.excel-result-card'));
      if (isResultA || isResultB) {
        console.log('🏆 GAME OVER / RESULT REACHED!');
        break;
      }

      console.log(`💥 [TURN ${turnNum}] BOTH USERS CLICKING MOVE 1...`);
      await pageA.evaluate(() => {
        const m = document.querySelectorAll('button.move-btn');
        if (m.length > 0 && !m[0].disabled) m[0].click();
        else console.log('Page A move button disabled or missing!');
      });

      await pageB.evaluate(() => {
        const m = document.querySelectorAll('button.move-btn');
        if (m.length > 0 && !m[0].disabled) m[0].click();
        else console.log('Page B move button disabled or missing!');
      });

      await new Promise(r => setTimeout(r, 4500));
    }

    console.log('\n=== FINAL STATE SUMMARY ===');
    await printState('FINAL');

    await browser.close();
    console.log('✅ Multi-turn faint test complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E ERROR:', err);
    await browser.close();
    process.exit(1);
  }
})();
