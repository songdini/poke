import puppeteer from 'puppeteer';

(async () => {
  const TEST_ROOM = 'TEST_ROOM_' + Date.now();
  console.log(`🚀 Launching Puppeteer E2E 1v1 PvP Test (Room: ${TEST_ROOM})...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const pageA = await browser.newPage();
    const pageB = await browser.newPage();

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

    console.log('⏳ Waiting for Battle Arena to load on both pages...');
    await pageA.waitForSelector('.move-btn', { timeout: 10000 });
    await pageB.waitForSelector('.move-btn', { timeout: 10000 });
    console.log('✅ Battle Arena & Move Buttons Loaded on both pages!');

    const getHpInfo = async (page, tag) => {
      const info = await page.evaluate(() => {
        const hud = document.querySelector('div[style*="Consolas"]');
        return hud ? hud.innerText : 'NO HUD';
      });
      console.log(`📊 [${tag} Debug HUD]:`, info);
    };

    console.log('\n=== BEFORE ATTACK (HP CHECK) ===');
    await getHpInfo(pageA, 'PAGE A INITIAL');
    await getHpInfo(pageB, 'PAGE B INITIAL');

    console.log('\n💥 BOTH USERS CLICKING MOVE 1 (ATTACK)...');
    await pageA.evaluate(() => {
      const m = document.querySelectorAll('button.move-btn');
      if (m.length > 0) m[0].click();
    });

    await pageB.evaluate(() => {
      const m = document.querySelectorAll('button.move-btn');
      if (m.length > 0) m[0].click();
    });

    console.log('⏳ Waiting 4 seconds for sequential attack animation & HP updates...');
    await new Promise(r => setTimeout(r, 4000));

    console.log('\n=== AFTER ATTACK (HP CHECK) ===');
    await getHpInfo(pageA, 'PAGE A AFTER ATTACK');
    await getHpInfo(pageB, 'PAGE B AFTER ATTACK');

    await pageA.screenshot({ path: 'scratch/page_a_result.png' });
    await pageB.screenshot({ path: 'scratch/page_b_result.png' });
    console.log('\n📸 Screenshots saved to scratch/page_a_result.png and scratch/page_b_result.png');

    await browser.close();
    console.log('✅ TEST COMPLETE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E ERROR:', err);
    await browser.close();
    process.exit(1);
  }
})();
