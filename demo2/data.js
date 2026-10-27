/* Readipedia 2.0 demo data.
   Relation labels and preset answers for the agent demo. In 2.0 these are
   generated offline by a model and spot-checked; here they were written once
   from the entries. Every evidence string is copied verbatim from an entry
   (English from data/wiki_articles, Chinese from data/wiki_articles_zh.js),
   so the site can find it in the rendered article and highlight it. */
(function () {
  const ID = {
    winston: 'character-recall-character-winston-smith-1910e4339629',
    julia: 'character-recall-character-julia-dd9a6077f139',
    obrien: 'character-recall-character-o-brien-abeb498acd48',
    bigBrother: 'character-recall-character-big-brother-d634b662a3fc',
    goldstein: 'character-recall-character-emmanuel-goldstein-f4210e83c600',
    charrington: 'character-recall-character-mr-charrington-fedfab22da60',
    katharine: 'character-recall-character-katharine-252d3095acf3',
    truth: 'location-recall-location-ministry-of-truth-ef6e5f31d68c',
    love: 'location-recall-location-ministry-of-love-2036b8f1ea56',
    room101: 'location-recall-location-room-101-ca8f1852ffa9',
    rat: 'creature-recall-creature-rat-d16ef86cfb69',
    diary: 'object-recall-object-03b8460a8170',
    paperweight: 'object-recall-object-09359ad9ee30',
    telescreen: 'expression-recall-expression-the-telescreen-8f1d3f00e7bf',
    doublethink: 'rule-recall-rule-doublethink-bc170022e80a',
    golden: 'location-recall-location-the-golden-country-16c8d8c98cd8',
    chestnut: 'location-recall-location-chestnut-tree-caf-f86ba95a289a',
    twoPlusTwo: 'expression-recall-expression-2-2-5-baf1cae1cb6e',
    freedom: 'expression-recall-expression-freedom-is-the-fre-e38557a8e351',
    innerParty: 'concept-recall-concept-inner-party-ca526a51b799'
  };

  const ev = (entity, en, zh) => ({ entity, en, zh });

  /* Winston's relations, in story order: the ring starts and ends at Big
     Brother, the first poster he passes and the last face he loves. */
  const winstonRelations = {
    center: ID.winston,
    edges: [
      { target: ID.bigBrother, label: { en: 'watched by, then loves', zh: '被监视，终爱上' },
        evidence: [
          ev(ID.winston, "On every landing the poster of Big Brother follows him with its caption 'BIG BROTHER IS WATCHING YOU.'", '每一层楼梯口，老大哥的海报都跟着他，配着标语：“老大哥在看着你。”'),
          ev(ID.winston, 'he had won the victory over himself, and he loved Big Brother.', '他赢得了对自己的胜利，他爱老大哥。')
        ] },
      { target: ID.telescreen, label: { en: 'watched by', zh: '时刻被监视' },
        evidence: [ev(ID.winston, 'the telescreen in his room can be dimmed but never switched off', '房间里的电幕可以调暗，却永远无法关闭')] },
      { target: ID.truth, label: { en: 'forges the past', zh: '在此篡改历史' },
        evidence: [ev(ID.winston, 'Winston works in the Records Department of the Ministry of Truth', '温斯顿在真理部的档案司工作。')] },
      { target: ID.diary, label: { en: 'rebellion begins', zh: '反叛的开端' },
        evidence: [ev(ID.winston, "Winston's rebellion begins with an object", '温斯顿的反叛始于一件物品')] },
      { target: ID.doublethink, label: { en: 'confronts', zh: '被迫直面' },
        evidence: [ev(ID.winston, 'The diary forces him to confront doublethink as a lived condition.', '日记迫使他直面双重思想作为一种生活状态。')] },
      { target: ID.katharine, label: { en: 'estranged wife', zh: '冷漠的妻子' },
        evidence: [ev(ID.winston, 'he recalls Katharine, his wife, who lay rigid as a jointed wooden image', '他也想起他的妻子凯瑟琳，她僵硬得像一个关节可以活动的木偶')] },
      { target: ID.golden, label: { en: 'dreams of', zh: '梦中的乡野' },
        evidence: [ev(ID.winston, 'The same dream landscape contains the Golden Country', '同一片梦境风景中还有黄金乡')] },
      { target: ID.julia, label: { en: 'loves, then betrays', zh: '相爱，终出卖' },
        evidence: [
          ev(ID.winston, "Reading 'I love you', he feels the desire to stay alive well up in him.", '读到“我爱你”三个字时，他感到心中升起想要活下去的欲望。'),
          ev(ID.winston, 'the one thing that had made him human, his love for Julia, has been destroyed.', '那唯一使他成为人的东西，即他对朱莉娅的爱，已被毁灭。')
        ] },
      { target: ID.charrington, label: { en: 'landlord, Thought Police', zh: '房东，实为思想警察' },
        evidence: [
          ev(ID.winston, "They rent the room above Mr Charrington's shop", '他们租下了查林顿先生店铺楼上的房间'),
          ev(ID.winston, 'Winston realises that he is looking, with knowledge, for the first time in his life at a member of the Thought Police.', '温斯顿意识到，他生平第一次带着认知，望着一名思想警察。')
        ] },
      { target: ID.paperweight, label: { en: 'a kept piece of the past', zh: '珍藏的过去' },
        evidence: [
          ev(ID.winston, 'Winston gazes into the glass paperweight he has bought, feeling that he is inside it', '温斯顿则凝视着他买来的玻璃镇纸，感觉自己仿佛置身其中'),
          ev(ID.winston, 'the glass paperweight is smashed on the hearthstone', '那只玻璃镇纸在壁炉石上摔碎')
        ] },
      { target: ID.obrien, label: { en: 'trusts, is remade by', zh: '信任他，被他改造' },
        evidence: [
          ev(ID.winston, "he momentarily catches O'Brien's eye, and for a fraction of a second is certain that O'Brien is thinking the same thing he is", '他片刻之间与奥布莱恩的目光相遇，并在一瞬间确信，奥布莱恩和他想的是同一件事'),
          ev(ID.winston, "O'Brien then takes over his re-education personally", '随后，奥布莱恩亲自接手他的再教育')
        ] },
      { target: ID.goldstein, label: { en: 'joins, then confesses', zh: '投奔，后招认' },
        evidence: [
          ev(ID.winston, 'drink a health to Emmanuel Goldstein, and enrol in the Brotherhood', '为埃曼纽尔·戈德斯坦干杯，并加入了兄弟会'),
          ev(ID.winston, 'years of contact with Goldstein', '以及多年来与戈德斯坦的往来')
        ] },
      { target: ID.love, label: { en: 'held and questioned', zh: '被关押审讯' },
        evidence: [ev(ID.winston, 'In the Ministry of Love the lights never go out; it is the place with no darkness', '在爱情部，灯从不熄灭；这里是没有黑暗的地方')] },
      { target: ID.room101, label: { en: 'broken here', zh: '在此崩溃' },
        evidence: [ev(ID.winston, 'The final ordeal is Room 101, the place where the worst thing in the world is kept.', '最后的磨难是101室，那里存放着世界上最可怕的东西。')] },
      { target: ID.rat, label: { en: 'worst fear', zh: '最深的恐惧' },
        evidence: [ev(ID.winston, 'For Winston the worst thing is rats', '对温斯顿来说，最可怕的东西是老鼠。')] },
      { target: ID.twoPlusTwo, label: { en: 'finally writes', zh: '最终写下' },
        evidence: [ev(ID.winston, "He traces '2 + 2 = 5' in the dust on the café table", '他用手指在咖啡馆桌子的灰尘上画下“2 + 2 = 5”')] },
      { target: ID.chestnut, label: { en: 'where he ends', zh: '获释后的归宿' },
        evidence: [ev(ID.winston, 'Released, Winston lives a ghostly half-life in the Chestnut Tree Café', '获释后，温斯顿过着一种幽灵般的半生，常去栗树咖啡馆')] }
    ],
    // Relations between two of Winston's neighbours, also sourced in his entry.
    cross: [
      { source: ID.julia, target: ID.golden, label: { en: 'leads him into', zh: '带他走进' },
        evidence: [ev(ID.winston, 'she leads him through the woods to a hidden clearing that matches his dream of the Golden Country', '她带他穿过树林，来到一片隐蔽的林中空地，与他梦中的黄金乡如出一辙')] },
      { source: ID.obrien, target: ID.goldstein, label: { en: 'toasts, falsely', zh: '假意举杯' },
        evidence: [ev(ID.winston, 'drink a health to Emmanuel Goldstein, and enrol in the Brotherhood', '为埃曼纽尔·戈德斯坦干杯，并加入了兄弟会')] },
      { source: ID.obrien, target: ID.room101, label: { en: 'brings the cage', zh: '带来鼠笼' },
        evidence: [ev(ID.winston, "O'Brien brings a wire cage whose mask will fit over his head", '奥布莱恩带来一只铁丝笼，笼口的面罩会罩在他的头上')] },
      { source: ID.room101, target: ID.rat, label: { en: 'holds', zh: '存放' },
        evidence: [ev(ID.winston, 'For Winston the worst thing is rats', '对温斯顿来说，最可怕的东西是老鼠。')] }
    ]
  };

  /* Preset answers. The answer text is the agent's own words; each [n] cites
     a verbatim sentence from an entry. The graph lists only the relations the
     answer uses, with positions on a unit square. */
  const answers = [
    {
      id: 'betray',
      q: { en: 'Why does Winston betray Julia?', zh: '温斯顿为什么会背叛朱莉娅？' },
      match: { en: ['betray', 'julia'], zh: ['背叛', '出卖', '朱莉娅'] },
      read: [ID.room101, ID.winston, ID.julia],
      text: {
        en: 'Because in Room 101 the Party finds the worst thing in the world for him: rats [1]. O\'Brien brings a cage of starving rats up to his face [2], and to save himself Winston has to put another person between his body and the cage, so he screams "Do it to Julia!" [3]. It is not a trick. Julia later says that at the time you mean it, and afterwards you no longer feel the same [4]. The Party proves it can get inside him: his love for Julia, the one thing that made him human, is destroyed [5].',
        zh: '因为党在101室找到了他“世界上最可怕的东西”：老鼠[1]。奥布莱恩把装着饥饿老鼠的铁丝笼逼近他的脸[2]，为了救自己，温斯顿必须让另一个人挡在自己和笼子之间，于是喊出“去咬朱莉娅！”[3]。这不是计策。朱莉娅后来说，在那一刻你是真心的，事后你对那个人的感觉就不再一样了[4]。党由此证明它能深入人心：温斯顿对朱莉娅的爱，那唯一使他成为人的东西，就此被毁灭[5]。'
      },
      cites: [
        ev(ID.room101, 'For Winston Smith the worst thing is rats', '对温斯顿·史密斯而言，最可怕的事情是老鼠'),
        ev(ID.winston, "O'Brien brings a wire cage whose mask will fit over his head while starving rats leap onto his face and bore into it.", '奥布莱恩带来一只铁丝笼，笼口的面罩会罩在他的头上，饥饿的老鼠会跳到他脸上，往里钻。'),
        ev(ID.winston, 'To save himself he must interpose another human being between his body and the cage', '为了救自己，他必须让另一个人类挡在他的身体与笼子之间'),
        ev(ID.room101, 'and at the time you mean it; afterwards you do not feel the same towards the other person.', '而在那一刻你是真心的；事后，你对那个人的感觉就不再一样了。'),
        ev(ID.winston, 'the one thing that had made him human, his love for Julia, has been destroyed.', '那唯一使他成为人的东西，即他对朱莉娅的爱，已被毁灭。')
      ],
      graph: {
        nodes: [
          { id: ID.obrien, x: 0, y: 0.2 },
          { id: ID.room101, x: 0.25, y: 0.8 },
          { id: ID.rat, x: 0.5, y: 0.2 },
          { id: ID.winston, x: 0.75, y: 0.8, primary: true },
          { id: ID.julia, x: 1, y: 0.2 }
        ],
        edges: [
          { source: ID.obrien, target: ID.room101, label: { en: 'brings the cage', zh: '带来鼠笼' }, cite: 2 },
          { source: ID.room101, target: ID.rat, label: { en: 'holds', zh: '存放' }, cite: 1 },
          { source: ID.rat, target: ID.winston, label: { en: 'his worst fear', zh: '最深的恐惧' }, cite: 1 },
          { source: ID.winston, target: ID.julia, label: { en: 'betrays', zh: '出卖' }, cite: 3 }
        ]
      }
    },
    {
      id: 'obrien',
      q: { en: "What is O'Brien to Winston?", zh: '奥布莱恩和温斯顿是什么关系？' },
      match: { en: ["o'brien", 'obrien', 'brien'], zh: ['奥布莱恩'] },
      read: [ID.obrien, ID.winston, ID.love],
      text: {
        en: "He looks like an ally and is in fact the hunter. A glance at the Two Minutes Hate convinces Winston that O'Brien hates the Party too [1]. O'Brien later approaches him and leaves his address, which looks like a recruitment [2]. At his flat Winston and Julia drink to Goldstein and join the Brotherhood [3]. But O'Brien is the Party's most dedicated servant [4], and in the Ministry of Love he takes over Winston's re-education himself [5].",
        zh: '表面上是同道，实际上是猎人。两分钟仇恨中短暂的对视，让温斯顿确信奥布莱恩也憎恨党[1]。奥布莱恩后来主动接近他、留下地址，看起来像一次招募[2]。温斯顿和朱莉娅在他家中为戈德斯坦干杯，加入兄弟会[3]。但奥布莱恩其实是党最忠诚的仆人[4]，最终在爱情部亲自接手温斯顿的再教育[5]。'
      },
      cites: [
        ev(ID.obrien, "Winston is convinced that O'Brien shares his secret hatred of the Party", '温斯顿确信，奥布莱恩也与他一样憎恨党'),
        ev(ID.obrien, 'a calculated act that appears to be a recruitment', '这一精心设计的举动，看起来像是一种招募'),
        ev(ID.winston, 'drink a health to Emmanuel Goldstein, and enrol in the Brotherhood', '为埃曼纽尔·戈德斯坦干杯，并加入了兄弟会'),
        ev(ID.obrien, "In reality, O'Brien is the Party's most dedicated servant", '实际上，奥布莱恩是党最忠诚的仆人'),
        ev(ID.winston, "O'Brien then takes over his re-education personally", '随后，奥布莱恩亲自接手他的再教育')
      ],
      graph: {
        nodes: [
          { id: ID.winston, x: 0, y: 0.5, primary: true },
          { id: ID.obrien, x: 0.42, y: 0.5 },
          { id: ID.goldstein, x: 1, y: 0.02 },
          { id: ID.innerParty, x: 1, y: 0.5 },
          { id: ID.love, x: 1, y: 0.98 }
        ],
        edges: [
          { source: ID.winston, target: ID.obrien, label: { en: 'trusts', zh: '信任' }, cite: 1 },
          { source: ID.obrien, target: ID.goldstein, label: { en: 'toasts, falsely', zh: '假意举杯' }, cite: 3 },
          { source: ID.obrien, target: ID.innerParty, label: { en: 'serves', zh: '效忠' }, cite: 4 },
          { source: ID.obrien, target: ID.love, label: { en: 're-educates him here', zh: '在此改造他' }, cite: 5 }
        ]
      }
    },
    {
      id: 'twoplustwo',
      q: { en: 'What does 2 + 2 = 5 mean in the book?', zh: '“2+2=5”在书里是什么意思？' },
      match: { en: ['2+2', '2 + 2', 'five'], zh: ['2+2', '2 + 2', '二加二'] },
      read: [ID.twoPlusTwo, ID.winston, ID.doublethink],
      text: {
        en: 'It is the most concentrated expression of the Party\'s power to dictate reality [1]. In his diary Winston had written the opposite axiom: freedom is the freedom to say that two plus two make four [2]. In the Ministry of Love O\'Brien holds up four fingers until Winston sees five [3]; the Party wants belief, not just the words. Behind it is doublethink, believing two contradictory truths at once [4]. Released, Winston traces "2 + 2 = 5" in the dust of the café table [5].',
        zh: '它是党支配现实之权力最集中的体现[1]。温斯顿曾在日记里写下相反的公理：自由就是说二加二等于四的自由[2]。在爱情部，奥布莱恩举起四根手指，直到温斯顿看见五根[3]；党要的不只是他说出来，而是他真的相信。背后是双重思想：同时相信两个相互矛盾的真理[4]。获释后，温斯顿在咖啡馆桌上的灰尘里写下“2 + 2 = 5”[5]。'
      },
      cites: [
        ev(ID.twoPlusTwo, "the single most concentrated expression of the Party's power to dictate reality", '是乔治·奥威尔《一九八四》中党支配现实之权力最集中的体现'),
        ev(ID.twoPlusTwo, 'Freedom is the freedom to say that two plus two make four. If that is granted, all else follows.', '自由就是说二加二等于四的自由。如果这一点被承认，其他一切便随之而来。'),
        ev(ID.twoPlusTwo, "O'Brien, holding up four fingers, demands that Winston say how many he sees", '奥布莱恩举起四根手指，要求温斯顿说出他看到了几根'),
        ev(ID.twoPlusTwo, 'The book defines doublethink as a mental discipline whose goal is to believe two contradictory truths at the same time.', '这本书把双重思想定义为一种心理纪律，其目标是同时相信两个相互矛盾的真理。'),
        ev(ID.winston, "He traces '2 + 2 = 5' in the dust on the café table", '他用手指在咖啡馆桌子的灰尘上画下“2 + 2 = 5”')
      ],
      graph: {
        nodes: [
          { id: ID.freedom, x: 0.04, y: 0.14, side: 'above', name: { en: '"Two plus two make four"', zh: '“二加二等于四”' } },
          { id: ID.winston, x: 0.04, y: 0.92, primary: true },
          { id: ID.twoPlusTwo, x: 0.52, y: 0.5 },
          { id: ID.obrien, x: 0.96, y: 0.14, side: 'above' },
          { id: ID.doublethink, x: 0.96, y: 0.92 }
        ],
        edges: [
          { source: ID.winston, target: ID.freedom, label: { en: 'writes in his diary', zh: '写进日记' }, cite: 2 },
          { source: ID.twoPlusTwo, target: ID.freedom, label: { en: 'negates', zh: '否定' }, cite: 2 },
          { source: ID.obrien, target: ID.twoPlusTwo, label: { en: 'makes him see', zh: '逼他看见' }, cite: 3 },
          { source: ID.twoPlusTwo, target: ID.doublethink, label: { en: 'puts into practice', zh: '体现' }, cite: 4 },
          { source: ID.winston, target: ID.twoPlusTwo, label: { en: 'finally writes', zh: '最终写下' }, cite: 5 }
        ]
      }
    }
  ];

  window.READIPEDIA_DEMO2 = {
    relations: { [ID.winston]: winstonRelations },
    answers
  };
})();
