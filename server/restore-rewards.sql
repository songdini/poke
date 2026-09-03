UPDATE farms
SET 
  active_pokemon = json('{"uid":"pmon_lizard_shiny","speciesId":5,"name":"리자드","nickname":"🔥황금리자드","stageIndex":1,"level":30,"exp":0,"maxExp":1500,"hunger":100,"happiness":100,"cleanliness":100,"energy":100,"isShiny":true,"types":["fire"],"sprites":{"front":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/5.png","showdownFront":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/5.gif"},"evolutionChain":[{"id":4,"name":"파이리","minLevel":1,"minHappiness":0,"types":["fire"],"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/4.png","showdownSprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/4.gif"},{"id":5,"name":"리자드","minLevel":16,"minHappiness":40,"types":["fire"],"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/5.png","showdownSprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/5.gif"},{"id":6,"name":"리자몽","minLevel":36,"minHappiness":80,"types":["fire","flying"],"sprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/6.png","showdownSprite":"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/6.gif"}],"adoptedAt":"2026-08-30T13:32:46.370Z","isGraduated":false,"totalPats":300,"jobsCompleted":10}'),
  incubating_egg = json('{"id":"egg_legendary_ready","name":"🌟 전설 및 특수 알","icon":"🌟","isGolden":true,"progress":100,"acquiredAt":"2026-09-03T14:30:00.000Z"}'),
  inventory = json('{"golden_egg":50,"mystery_egg":30,"oran_berry":99,"sitrus_berry":50,"mild_soap":99,"aroma_bubble":50,"toy_ball":99,"plush_doll":50,"energy_drink":99,"max_potion":30}'),
  coins = 10000,
  status_msg = '👑 [VVIP] 시공을 초월해 돌아온 불사조 트레이너 ✨',
  last_active = strftime('%s', 'now') * 1000,
  updated_at = CURRENT_TIMESTAMP
WHERE username = 'SaSaDong Real DDini';
