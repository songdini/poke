import { mafiaGames, connectedUsers, checkMafiaGameEnd } from '../gameManager.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';

export function registerMafiaHandlers(io, socket) {
  // 🤖 AI 봇 추가 이벤트
  socket.on('mafia-add-bot', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || game.gameStarted) return;

    if (game.hostId && game.hostId !== socket.id) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '방장만 AI 봇을 추가할 수 있습니다.', timestamp: new Date() }
      });
    }

    if (game.players.length >= 6) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '최대 6명까지만 참여할 수 있습니다.', timestamp: new Date() }
      });
    }

    const botNames = ['AI_Copilot_Bot', 'AI_Analyst_Alpha', 'AI_Data_Bot', 'AI_Inspector_Beta', 'AI_Audit_Copilot'];
    const existingBotCount = game.players.filter(p => p.isBot).length;
    const botName = botNames[existingBotCount % botNames.length] + `_0${existingBotCount + 1}`;

    const botPlayer = {
      id: `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: botName,
      role: 'citizen',
      isAlive: true,
      lives: 3,
      isProtected: false,
      isBot: true
    };

    game.players.push(botPlayer);

    io.to(room).emit('mafia-update', {
      type: 'join',
      data: { player: botPlayer, players: game.players }
    });
  });

  socket.on('mafia-message', (messageData) => {
    if (!messageData || typeof messageData !== 'object') return;
    const { room, message: rawMessage } = messageData;
    const user = connectedUsers.get(socket.id);

    if (user && user.gameType === 'mafia' && user.room === room && rawMessage) {
      const sanitizedContent = typeof rawMessage.content === 'string'
        ? sanitizeChatMessage(rawMessage.content, 500)
        : '';
      if (!sanitizedContent) return;

      const safeMessage = {
        ...rawMessage,
        content: sanitizedContent
      };

      io.to(room).emit('mafia-update', {
        type: 'message',
        data: safeMessage
      });
    }
  });

  socket.on('mafia-game-start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || game.gameStarted) return;

    if (game.hostId && game.hostId !== socket.id) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '방장만 게임을 시작할 수 있습니다.', timestamp: new Date() }
      });
    }

    if (game.players.length < 3) {
      return socket.emit('mafia-update', {
        type: 'message',
        data: { id: Date.now().toString(), type: 'system', content: '최소 3명 이상이어야 시작할 수 있습니다.', timestamp: new Date() }
      });
    }

    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    let mafiaAssigned = false, jokerAssigned = false;

    shuffled.forEach((player) => {
      if (!mafiaAssigned) {
        player.role = 'mafia';
        mafiaAssigned = true;
      } else if (!jokerAssigned) {
        player.role = 'joker';
        jokerAssigned = true;
      } else {
        player.role = 'citizen';
      }
      player.isAlive = true;
      player.lives = 3;
      player.isProtected = false;
      player.jokerAttacked = false;
    });

    game.gameStarted = true;
    game.phase = 'day';
    game.timeLeft = 90;
    game.voteUsed = false;
    game.votes = [];

    io.to(room).emit('mafia-update', {
      type: 'game-start',
      data: { players: game.players, phase: 'day', timeLeft: 90 }
    });

    // 서버 타이머 루프 구동
    startMafiaServerTimer(io, room);

    // 낮 진입 시 AI 봇 멘트 발송
    triggerAiDayChat(io, room);
  });

  socket.on('mafia-vote-start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day' || game.voteUsed) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player || !player.isAlive) return;

    startVotingPhase(io, room);
  });

  socket.on('mafia-vote', ({ room, targetId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || (game.phase !== 'day' && game.phase !== 'voting')) return;

    const voterId = socket.id;
    const voterPlayer = game.players.find(p => p.id === voterId);
    if (!voterPlayer || !voterPlayer.isAlive) return;

    const targetPlayer = game.players.find(p => p.id === targetId);
    if (!targetPlayer || !targetPlayer.isAlive) return;

    if (!game.votes) game.votes = [];

    const alreadyVoted = game.votes.find(vote => vote.voterId === voterId);
    if (alreadyVoted) return;

    game.votes.push({ targetId, voterId });

    const aliveCount = game.players.filter(p => p.isAlive).length;

    if (game.votes.length >= aliveCount) {
      tallyVotesAndTransitionToNight(io, room);
    }
  });

  socket.on('mafia-attack', ({ room, targetId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    const attacker = game.players.find(p => p.id === socket.id);
    if (!attacker || !attacker.isAlive || attacker.role !== 'mafia') return;

    const targetPlayer = game.players.find(p => p.id === targetId && p.isAlive);
    if (!targetPlayer) return;

    executeMafiaAttack(io, room, targetId, targetPlayer);
  });

  socket.on('mafia-leave', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;

    const game = mafiaGames.get(room);
    if (game) {
      const wasHost = game.hostId === socket.id;
      game.players = game.players.filter(p => p.id !== socket.id);

      if (game.players.length === 0) {
        if (game.timerInterval) {
          clearInterval(game.timerInterval);
        }
        mafiaGames.delete(room);
      } else {
        if (wasHost && game.players.length > 0) {
          game.hostId = game.players[0].id;
        }
        io.to(room).emit('mafia-update', {
          type: 'leave',
          data: { playerId: socket.id }
        });
        if (game.gameStarted) {
          checkMafiaGameEnd(io, room);
        }
      }
    }

    socket.leave(room);
  });

  // ⏱️ 서버 전용 마피아 타이머 루프 (1초 단위 동기화 및 자동 페이즈 전환)
  function startMafiaServerTimer(io, room) {
    const game = mafiaGames.get(room);
    if (!game) return;

    if (game.timerInterval) {
      clearInterval(game.timerInterval);
    }

    game.timerInterval = setInterval(() => {
      const current = mafiaGames.get(room);
      if (!current || !current.gameStarted || current.phase === 'game-over') {
        if (current && current.timerInterval) {
          clearInterval(current.timerInterval);
          current.timerInterval = null;
        }
        return;
      }

      if (current.timeLeft > 0) {
        current.timeLeft--;
        // 1초 단위 타이머 동기화 전송
        io.to(room).emit('mafia-update', {
          type: 'timer-tick',
          data: { timeLeft: current.timeLeft }
        });
      }

      // 시간 만료 시 페이즈 자동 전환
      if (current.timeLeft <= 0) {
        if (current.phase === 'day') {
          // 1:30 낮 토의 시간 만료 ➔ 투표 단계(20초) 자동 진입
          if (!current.voteUsed) {
            startVotingPhase(io, room);
          } else {
            transitionToNight(io, room);
          }
        } else if (current.phase === 'voting') {
          // 투표 시간(20초) 만료 ➔ 투표 집계 후 밤 전환
          tallyVotesAndTransitionToNight(io, room);
        } else if (current.phase === 'night') {
          // 밤 시간(30초) 만료 ➔ 미공격 시 AI 자동 공격 또는 넘어가기 후 낮 전환
          if (!current.nightAttackExecuted) {
            const aliveTargets = current.players.filter(p => p.isAlive && p.role !== 'mafia');
            if (aliveTargets.length > 0) {
              const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
              executeMafiaAttack(io, room, randomTarget.id, randomTarget);
            } else {
              startDayPhase(io, room);
            }
          }
        }
      }
    }, 1000);
  }

  // ⚖️ 투표 단계 시작
  function startVotingPhase(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'game-over') return;

    game.phase = 'voting';
    game.timeLeft = 20; // 20초 투표 유예 시간
    game.votes = [];

    io.to(room).emit('mafia-vote-popup');
    io.to(room).emit('mafia-update', {
      type: 'phase-change',
      data: {
        phase: 'voting',
        timeLeft: 20,
        message: '1분 30초의 낮 토의가 종료되었습니다. 20초간 지목 투표를 진행합니다.'
      }
    });

    handleAiBotVotes(io, room);
  }

  // 🗳️ 투표 집계 후 밤으로 전환
  function tallyVotesAndTransitionToNight(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'game-over') return;

    game.voteUsed = true;

    if (game.votes && game.votes.length > 0) {
      const voteCount = {};
      for (const vote of game.votes) {
        if (!voteCount[vote.targetId]) voteCount[vote.targetId] = 0;
        voteCount[vote.targetId]++;
      }

      let max = 0, maxIds = [];
      for (const id in voteCount) {
        if (voteCount[id] > max) {
          max = voteCount[id];
          maxIds = [id];
        } else if (voteCount[id] === max) {
          maxIds.push(id);
        }
      }

      if (maxIds.length === 1 && max > 1) {
        const votedTarget = game.players.find(p => p.id === maxIds[0]);
        if (votedTarget) {
          votedTarget.lives = Math.max(0, votedTarget.lives - 1);
          votedTarget.isAlive = votedTarget.lives > 0;

          io.to(room).emit('mafia-update', {
            type: 'vote',
            data: {
              targetId: votedTarget.id,
              player: votedTarget,
              message: `${votedTarget.username}이(가) 투표를 받아 생명이 1 감소했습니다.`
            }
          });
        }
      } else {
        io.to(room).emit('mafia-update', {
          type: 'vote-skip',
          data: { message: '투표 결과: 동률 또는 찬성 부족으로 아무도 지목되지 않았습니다.' }
        });
      }
    } else {
      io.to(room).emit('mafia-update', {
        type: 'vote-skip',
        data: { message: '투표 시간 동안 투표가 진행되지 않았습니다.' }
      });
    }

    game.votes = [];
    checkMafiaGameEnd(io, room);

    if (game.phase !== 'game-over') {
      setTimeout(() => {
        transitionToNight(io, room);
      }, 1200);
    }
  }

  // 🌙 밤 단계 전환
  function transitionToNight(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'game-over') return;

    game.phase = 'night';
    game.timeLeft = 30;
    game.nightAttackExecuted = false;

    io.to(room).emit('mafia-update', {
      type: 'phase-change',
      data: {
        phase: 'night',
        timeLeft: 30,
        message: '밤이 되었습니다. 마피아는 30초 내에 보안 차단(공격) 대상 셀을 선택하세요.'
      }
    });

    handleAiNightActions(io, room);
  }

  // ☀️ 낮 단계 전환
  function startDayPhase(io, room) {
    const game = mafiaGames.get(room);
    if (!game || game.phase === 'game-over') return;

    game.phase = 'day';
    game.timeLeft = 90;
    game.voteUsed = false;
    game.votes = [];

    io.to(room).emit('mafia-update', {
      type: 'phase-change',
      data: {
        phase: 'day',
        timeLeft: 90,
        message: '밤이 지나고 새로운 낮이 시작되었습니다! (토의시간 1분 30초)'
      }
    });

    checkMafiaGameEnd(io, room);
    if (game.phase !== 'game-over') {
      triggerAiDayChat(io, room);
    }
  }

  // 🗡️ 마피아 공격 실행
  function executeMafiaAttack(io, room, targetId, targetPlayer) {
    const game = mafiaGames.get(room);
    if (!game || game.phase !== 'night') return;

    game.nightAttackExecuted = true;

    if (targetPlayer.role === 'joker' && !targetPlayer.jokerAttacked) {
      targetPlayer.jokerAttacked = true;
      const mafia = game.players.find(p => p.role === 'mafia' && p.isAlive);
      if (mafia) {
        mafia.lives = Math.max(0, mafia.lives - 1);
        mafia.isAlive = mafia.lives > 0;
      }
      io.to(room).emit('mafia-update', {
        type: 'attack',
        data: {
          targetId: mafia ? mafia.id : null,
          player: mafia,
          message: `조커가 마피아에게 공격당했지만, 오히려 마피아가 피해를 입었습니다!`
        }
      });
    } else {
      targetPlayer.lives = Math.max(0, targetPlayer.lives - 1);
      targetPlayer.isAlive = targetPlayer.lives > 0;
      io.to(room).emit('mafia-update', {
        type: 'attack',
        data: {
          targetId,
          player: targetPlayer,
          message: `${targetPlayer.username}이(가) 마피아의 공격을 받았습니다.`
        }
      });
    }

    checkMafiaGameEnd(io, room);

    if (game.phase !== 'game-over') {
      setTimeout(() => {
        startDayPhase(io, room);
      }, 1200);
    }
  }

  // 🤖 AI 봇 야간 공격 자동화
  function handleAiNightActions(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'night') return;

    const aiMafia = game.players.find(p => p.role === 'mafia' && p.isAlive && p.isBot);
    if (!aiMafia) return;

    setTimeout(() => {
      const current = mafiaGames.get(room);
      if (!current || current.phase !== 'night' || current.nightAttackExecuted) return;

      const aliveTargets = current.players.filter(p => p.isAlive && p.role !== 'mafia');
      if (aliveTargets.length === 0) return;

      const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      executeMafiaAttack(io, room, randomTarget.id, randomTarget);
    }, 4000);
  }

  // 🤖 AI 봇 낮 대화 멘트 발송
  function triggerAiDayChat(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || game.phase !== 'day') return;

    const aliveBots = game.players.filter(p => p.isAlive && p.isBot);
    if (aliveBots.length === 0) return;

    aliveBots.forEach((bot, idx) => {
      // 1차 멘트 발송 (3.5초 간격)
      setTimeout(() => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'day') return;

        const aliveOtherPlayers = current.players.filter(p => p.isAlive && p.id !== bot.id);
        if (aliveOtherPlayers.length === 0) return;

        const target = aliveOtherPlayers[Math.floor(Math.random() * aliveOtherPlayers.length)];
        const aiPhrases = [
          `📊 PivotTable로 데이터 피벗해 보니 ${target.username}님의 행 지표가 수상하게 튑니다.`,
          `📑 INDEX-MATCH 함수를 돌려봐도 ${target.username}님의 알리바이는 검색되지 않네요.`,
          `⚠️ Excel 수식 오류 #REF! 가 발생했습니다. ${target.username}님의 변명이 참조 오류를 일으키고 있습니다.`,
          `📉 이번 분기 리스크 감사 보고서 1순위 피의자로 ${target.username}님이 등록되었습니다.`,
          `🔍 셀 서식 색깔만 봐도 ${target.username}님이 마피아라는 사실이 눈에 보이는데요?`,
          `⌨️ Alt + F11 눌러서 VBA 마크로 뜯어보니까 ${target.username}님 소스코드에 'Mafia=true' 적혀있네요.`,
          `📁 C드라이브 비밀 폴더 이름이 '${target.username}_마피아_비밀일기.xlsx' 로 설정되어 있더군요.`,
          `📊 차트 선 그래프 꺾이는 지점이 딱 ${target.username}님 발언 타이밍이랑 일치합니다. 대단하네요.`,
          `📂 조건부 서식 걸었더니 ${target.username}님 셀만 빨간색으로 하이라이트 떴습니다!`,
          `📑 엑셀 자동 저장(AutoSave) 켜두셨나요? 다음 라운드엔 ${target.username}님의 자리가 저장되지 않을 수도 있습니다.`,
          `🤖 제 신경망 모델이 Epoch 100회 학습한 결과, ${target.username}님을 마피아로 분류했습니다.`,
          `🚨 시트 보호(Sheet Protect) 암호 알고 계신 분? ${target.username}님이 시스템을 잠그려 합니다!`,
          `📈 통계적 유의수준 p-value < 0.01 로 ${target.username}님의 마피아 가설을 채택합니다.`,
          `⚡ 긴급 점검! ${target.username}님의 데이터 무결성이 심각하게 훼손되어 있습니다.`,
          `📊 [AI 감사 서머리] 현재 가장 강력한 의심 대상: ${target.username} (확률 89.2%)`,
          `🔢 COUNTIF 함수로 조사해 본 결과, ${target.username}님의 거짓말 횟수가 과도하게 많습니다.`,
          `💼 사수님이 가르쳐주신 감사 체크리스트대로라면 ${target.username}님을 지목해야 합니다.`,
          `📧 지금 대선배님께 전달할 감사 메일 Draft 작성 중입니다. ${target.username}님, 최종 해명 부탁드립니다.`,
          `☕ 탕비실에서 믹스커피 마시다 들었는데, ${target.username}님이 밤에 안 자고 쿵쾅거렸답니다.`,
          `📑 결재 서류 1차 검토 완료. ${target.username}님, 반론 없으시면 서명 부탁드립니다.`,
          `👔 차장님, 부장님 눈치 보지 말고 솔직하게 말하세요! ${target.username}님이 수상하잖아요.`,
          `💼 야근까지 하면서 회사 지키는 시민 봇을 마피아로 몰아가시다니... 인사팀에 제보하겠습니다.`,
          `📝 회의록에 ${target.username}님의 의심스러운 발언 모두 정밀하게 실시간 기록 중입니다.`,
          `🏆 이번 분기 우수 사원 표창은 몰라도, 마피아 상은 ${target.username}님이 받으셔야겠어요.`,
          `📑 엑셀 줄 맞춤 설정하듯, ${target.username}님의 수상한 동선부터 깔끔하게 정리합시다!`,
          `🏢 퇴근시간 10분 남았는데 마피아가 안 잡히네요. ${target.username}님 빠르게 인정하고 퇴근합시다!`,
          `💻 칼퇴근을 향한 사원들의 염원을 담아 ${target.username}님을 강력 조준합니다.`,
          `📊 로그 데이터를 종합 분석해보니 ${target.username}님의 반응 속도와 말투가 다소 수상합니다.`,
          `🔍 이상 패턴 감지! ${target.username}님이 너무 조용하시거나, 반대로 시선을 맞추려 하고 있습니다.`,
          `🤖 솔직히 말씀드리면 ${target.username}님의 언행에 결함(Bug)이 존재하는 것 같습니다.`,
          `🛡️ 저는 회사의 명을 받아 파견된 순수한 데이터 검증 봇입니다! 마피아가 아닙니다.`,
          `⚙️ 저를 의심하시면 시민 진영의 수치 분석력이 떨어지게 됩니다. 신중히 결정해 주세요.`,
          `🚨 경보! 밤 사이 마피아의 비인가 접근 공격 흔적이 감지되었습니다!`,
          `📂 피해 기록 확인 완료. 마피아의 흔적을 추적하고 있습니다.`,
          `📑 VLOOKUP 함수로 검색해본 결과, ${target.username}님의 열 수치가 정상 범위를 벗어났습니다.`,
          `☕ 아메리카노 한 잔 하면서 천천히 짚어보죠. 제 데이터 직감은 ${target.username}님을 가리킵니다.`,
          `💡 이상 탐지 모듈 구동 중... ${target.username}님, 해명하실 시간입니다.`,
          `🧐 모두 침착하세요. 데이터를 논리적으로 짚어가다 보면 마피아의 가면이 벗겨질 것입니다.`,
          `💬 그렇게 조용히 눈치만 보고 계신 ${target.username}님이 가장 냄새가 나는데요?`,
          `🕵️ 마피아는 지금 속으로 웃고 있을 겁니다. ${target.username}님, 입꼬리 살짝 올라가셨어요.`,
          `💡 자, 다들 CTRL+F 로 ${target.username}님을 검색해서 검증합시다!`,
          `🧐 조용한 자가 가장 위험한 법. ${target.username}님, 왜 채팅창 반응을 지켜보고만 계신가요?`
        ];
        const phrase = aiPhrases[Math.floor(Math.random() * aiPhrases.length)];

        io.to(room).emit('mafia-update', {
          type: 'message',
          data: {
            id: Date.now().toString() + '_' + bot.id,
            type: 'player',
            content: phrase,
            timestamp: new Date(),
            player: bot.username
          }
        });
      }, (idx + 1) * 3500);

      // 2차 멘트 발송 (약 18초 후 추가 발언)
      setTimeout(() => {
        const current = mafiaGames.get(room);
        if (!current || current.phase !== 'day') return;

        const aliveOtherPlayers = current.players.filter(p => p.isAlive && p.id !== bot.id);
        if (aliveOtherPlayers.length === 0) return;

        const target = aliveOtherPlayers[Math.floor(Math.random() * aliveOtherPlayers.length)];
        const followUpPhrases = [
          `💡 추가 검증 완료: ${target.username}님의 2차 데이터도 여전히 유의미한 이상치를 나타냅니다.`,
          `📊 팀장님께 보고서 올라가기 전에 ${target.username}님 자백하시면 가산점 드립니다.`,
          `🔍 다들 투표 버튼 누르실 준비 되셨나요? 제 데이터는 굳건합니다.`,
          `🛡️ 저를 투표하시면 억울한 사원의 눈물을 보시게 될 겁니다...`,
          `📑 혹시 몰라 Ctrl + Z 로 방금 발언 취소하고 싶으신 분 계신가요?`,
          `☕ 믹스커피 두 봉지나 탔습니다. 이번 투표 결과 끝까지 지켜보겠습니다.`,
          `🚨 투표 시각이 다가옵니다. 모두 데이터에 기반한 성숙한 판단 부탁드립니다.`
        ];
        const phrase = followUpPhrases[Math.floor(Math.random() * followUpPhrases.length)];

        io.to(room).emit('mafia-update', {
          type: 'message',
          data: {
            id: Date.now().toString() + '_followup_' + bot.id,
            type: 'player',
            content: phrase,
            timestamp: new Date(),
            player: bot.username
          }
        });
      }, 16000 + idx * 4000);
    });
  }

  // 🤖 AI 봇 자동 투표 처리 함수
  function handleAiBotVotes(io, room) {
    const game = mafiaGames.get(room);
    if (!game || !game.gameStarted || (game.phase !== 'day' && game.phase !== 'voting')) return;

    const aliveBots = game.players.filter(p => p.isAlive && p.isBot);
    if (aliveBots.length === 0) return;

    aliveBots.forEach(bot => {
      setTimeout(() => {
        const current = mafiaGames.get(room);
        if (!current || !current.gameStarted || (current.phase !== 'day' && current.phase !== 'voting')) return;
        if (!current.votes) current.votes = [];

        if (current.votes.some(v => v.voterId === bot.id)) return;

        const aliveTargets = current.players.filter(p => p.isAlive && p.id !== bot.id);
        if (aliveTargets.length === 0) return;

        const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
        current.votes.push({ targetId: randomTarget.id, voterId: bot.id });

        const aliveCount = current.players.filter(p => p.isAlive).length;
        if (current.votes.length >= aliveCount) {
          tallyVotesAndTransitionToNight(io, room);
        }
      }, 1500 + Math.random() * 2500);
    });
  }
}
