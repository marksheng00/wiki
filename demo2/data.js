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
    innerParty: 'concept-recall-concept-inner-party-ca526a51b799',
    roomAbove: 'location-recall-location-the-room-above-mr-ch-d996dc963c72',
    doIt: 'expression-recall-expression-do-it-to-julia-c234ebbf6693',
    lovedBB: 'expression-recall-expression-he-loved-big-broth-c26cf8274fbb',
    hate: 'expression-recall-expression-the-two-minutes-ha-e04f1b223bd4'
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

  /* Preset answers. The agent writes in its own words; every [n] cites a
     verbatim sentence from an entry, numbered in reading order, and every
     {@key|text} links an entry that opens beside the conversation. The first
     mention of a person or place carries a short gloss, so the answer reads
     for someone who has not read the book. The chain lists the moments the
     answer relies on, in story order. */
  const answers = [
    {
      id: 'betray',
      q: { en: 'Why does Winston betray Julia?', zh: '温斯顿为什么会背叛朱莉娅？' },
      match: { en: ['betray', 'julia'], zh: ['背叛', '出卖', '朱莉娅'] },
      read: [ID.winston, ID.julia, ID.room101, ID.obrien],
      lead: {
        en: `He does not choose to betray her. In {@room101|Room 101} his deepest fear breaks him, and that is the Party's aim: to prove it can get inside a person and destroy the last thing that is his own, his love for Julia.`,
        zh: `他不是理性地选择了背叛，而是在{@room101|101室}被最深的恐惧压垮。这正是党要的结果：证明它能进入人的内心，毁掉他身上最后一样属于自己的东西，也就是对朱莉娅的爱。`
      },
      sections: [
        {
          h: { en: 'Why their love was already rebellion', zh: '他们的爱为什么本身就是反叛' },
          text: {
            en: `{@winston|Winston} is a low-ranking clerk at the Ministry of Truth, where the Party rewrites old newspapers [1]. The Party wants to strip all pleasure out of love; marriage exists only to produce children for the Party [2]. So when {@julia|Julia}, a young woman from the Fiction Department, slips him a note in a corridor [3], the affair is political from the start: Winston feels their love-making is a blow struck against the Party [4]. They rent a room with no telescreen above {@charrington|Mr Charrington}'s junk shop [5], and Julia insists: "They can't get inside you." [6]`,
            zh: `{@winston|温斯顿}是真理部档案司的小职员，那里专门篡改旧报纸，让过去符合党现在的说法[1]。党要从男女之爱中剥除一切快乐，婚姻只为给党生孩子[2]。所以当小说部的年轻姑娘{@julia|朱莉娅}在走廊里把一张纸条塞进他手里[3]，这段关系从一开始就是政治行为：温斯顿觉得他们的结合是对党的一记打击[4]。两人在{@charrington|查林顿}旧货店楼上租了一间没有电幕的屋子[5]，朱莉娅还夸口说：“他们进不了你的内心。”[6]`
          }
        },
        {
          h: { en: 'From the arrest to Room 101', zh: '从被捕到101室' },
          text: {
            en: `The room was watched all along: a telescreen was hidden behind a picture on the wall [7], and their landlord turns out to be a member of the Thought Police [8]. In the {@love|Ministry of Love}, the Party's prison, Winston is beaten and questioned until he confesses to whatever is put in front of him [9]. Then {@obrien|O'Brien}, the Inner Party official Winston had trusted as a fellow rebel, holds up four fingers and uses pain until Winston sees five [10]. O'Brien is clear about the goal: the Party makes no martyrs, it changes its enemies before it kills them [11]. The last step is {@room101|Room 101}, which holds each prisoner's worst fear; for Winston it is rats [12]. A cage of starving rats is brought to his face [13], and his only way out is to put another person between himself and the cage, so he screams "Do it to Julia!" [14]`,
            zh: `那间屋子其实一直在监视之下：电幕就藏在墙上的版画后面[7]，房东查林顿是思想警察[8]。两人被捕后，温斯顿在党的监狱{@love|爱情部}里被殴打、审问，让他承认什么他就承认什么[9]。随后接手的是{@obrien|奥布莱恩}，一位核心党员，温斯顿曾以为他也是反叛者。奥布莱恩举起四根手指，用电刑逼他“看见”五根[10]。他说得很明白：党不制造殉道者，它要在杀死敌人之前先改造他们[11]。最后一关是{@room101|101室}，那里放着每个囚犯“世界上最可怕的东西”，对温斯顿来说是老鼠[12]。装着饥饿老鼠的笼子扣向他的脸[13]，他唯一的出路，是把另一个人推到自己和笼子之间，于是他喊出：“去咬朱莉娅！”[14]`
          }
        },
        {
          h: { en: 'Why it is a real betrayal', zh: '为什么说这是真正的背叛' },
          text: {
            en: `It is not a trick to survive. When they meet again after their release, Julia has a scar across her forehead [15], and she describes exactly what happened: they threaten you with what you cannot stand, you say "do it to somebody else", and at the time you mean it; afterwards you do not feel the same towards that person [16]. She had betrayed him too, immediately [17]. Winston knows something was burnt out of him: his love for Julia, the one thing that had made him human, is gone [18].`,
            zh: `这不是保命的权宜之计。获释后两人再次相遇，朱莉娅额头上多了一道伤疤[15]。她把机制说得很准确：他们拿你受不了的东西威胁你，你就说“别对我，去对别人”，而那一刻你是真心的；事后你对那个人的感觉就再也不一样了[16]。她在里面也毫不犹豫地出卖了温斯顿[17]。温斯顿自己也明白，胸中有什么被烧掉了：那唯一使他成为人的东西，他对朱莉娅的爱，已被毁灭[18]。`
          }
        },
        {
          h: { en: 'What Orwell is saying', zh: '奥威尔想说什么' },
          text: {
            en: `Room 101 is the book's answer to Julia's "They can't get inside you": it is exactly where the Party gets inside [19]. That is what sets this regime apart from ordinary tyranny. Silence and confession are not enough; it wants to remake what a person loves and believes. So the novel does not end with Winston's execution but with his surrender: he had won the victory over himself, and he loved {@bigBrother|Big Brother} [20].`,
            zh: `朱莉娅说“他们进不了你的内心”，101室就是小说给出的回答：党恰恰在这里进入了人心[19]。这也是它和一般暴政的区别：让人闭嘴、让人认罪都不够，它要改造人爱什么、信什么。所以小说的结局不是温斯顿被处决，而是他的投降：他赢得了对自己的胜利，他爱{@bigBrother|老大哥}[20]。`
          }
        }
      ],
      cites: [
        ev(ID.winston, 'Winston works in the Records Department of the Ministry of Truth', '温斯顿在真理部的档案司工作。'),
        ev(ID.winston, "the Party's real, undeclared purpose is to remove all pleasure from the sexual act", '党真正的、未公开宣布的目的，是从性行为中彻底剥除一切快乐'),
        ev(ID.julia, 'while he helps her up she slips a scrap of paper into his hand', '在他扶她起身时，她把一小张纸条塞进他的手里'),
        ev(ID.winston, 'a blow struck against the Party, a political act', '对党的一记打击，一种政治行为'),
        ev(ID.winston, "They rent the room above Mr Charrington's shop", '他们租下了查林顿先生店铺楼上的房间'),
        ev(ID.julia, "Winston once clung to her boast that 'They can't get inside you'", '温斯顿曾紧紧抓住她的一句夸口'),
        ev(ID.winston, 'The telescreen has been hidden behind the steel engraving of St Clement', '电幕一直藏在圣克莱门特丹教堂的钢版画后面'),
        ev(ID.winston, 'Winston realises that he is looking, with knowledge, for the first time in his life at a member of the Thought Police.', '温斯顿意识到，他生平第一次带着认知，望着一名思想警察。'),
        ev(ID.winston, 'he becomes simply a mouth that utters and a hand that signs whatever is demanded', '他变成了一张只会说话的嘴，一只只会签字的手'),
        ev(ID.winston, 'holding up four fingers, he demands that Winston see five', '奥布莱恩伸出四根手指，要温斯顿说出看到的是五根'),
        ev(ID.winston, 'there are no martyrdoms in this place, and that the Party does not destroy its enemies but changes them', '这里没有殉道者，党也不消灭敌人，而是改造他们'),
        ev(ID.room101, 'For Winston Smith the worst thing is rats', '对温斯顿·史密斯而言，最可怕的事情是老鼠'),
        ev(ID.winston, "O'Brien brings a wire cage whose mask will fit over his head while starving rats leap onto his face and bore into it.", '奥布莱恩带来一只铁丝笼，笼口的面罩会罩在他的头上，饥饿的老鼠会跳到他脸上，往里钻。'),
        ev(ID.winston, 'To save himself he must interpose another human being between his body and the cage', '为了救自己，他必须让另一个人类挡在他的身体与笼子之间'),
        ev(ID.winston, 'she has a scar across her forehead', '她额头上有一道伤疤'),
        ev(ID.room101, 'and at the time you mean it; afterwards you do not feel the same towards the other person.', '而在那一刻你是真心的；事后，你对那个人的感觉就不再一样了。'),
        ev(ID.julia, "O'Brien tells Winston that Julia betrayed him", '奥布莱恩告诉温斯顿，朱莉娅'),
        ev(ID.winston, 'the one thing that had made him human, his love for Julia, has been destroyed.', '那唯一使他成为人的东西，即他对朱莉娅的爱，已被毁灭。'),
        ev(ID.room101, 'it is where the Party gets inside', '正是在这里，党深入了人心'),
        ev(ID.winston, 'he had won the victory over himself, and he loved Big Brother.', '他赢得了对自己的胜利，他爱老大哥。')
      ],
      chain: [
        { entity: ID.julia, cite: 3, label: { en: 'Julia slips him a note', zh: '朱莉娅递来纸条' } },
        { entity: ID.roomAbove, cite: 5, label: { en: 'A room with no telescreen', zh: '租下没有电幕的屋子' } },
        { entity: ID.charrington, cite: 8, label: { en: 'Arrested; the landlord is Thought Police', zh: '被捕，房东是思想警察' } },
        { entity: ID.love, cite: 10, label: { en: 'Four fingers become five', zh: '四根手指变成五根' } },
        { entity: ID.room101, cite: 12, label: { en: 'Room 101: rats', zh: '101室：老鼠' } },
        { entity: ID.doIt, cite: 14, label: { en: '"Do it to Julia!"', zh: '“去咬朱莉娅！”' } },
        { entity: ID.julia, cite: 16, label: { en: 'They meet again, changed', zh: '重逢，已形同陌路' } },
        { entity: ID.lovedBB, cite: 20, label: { en: 'He loves Big Brother', zh: '他爱老大哥' } }
      ],
      follow: ['obrien', 'twoplustwo']
    },
    {
      id: 'obrien',
      q: { en: "What is O'Brien to Winston?", zh: '奥布莱恩和温斯顿是什么关系？' },
      match: { en: ["o'brien", 'obrien', 'brien'], zh: ['奥布莱恩'] },
      read: [ID.obrien, ID.winston, ID.love],
      lead: {
        en: `He looks like an ally and is in fact the hunter. {@obrien|O'Brien} is an Inner Party official who leads Winston step by step into a trap, then remakes him personally.`,
        zh: `表面上是同道，实际上是猎人。{@obrien|奥布莱恩}是一位核心党员，他引着温斯顿一步步走进陷阱，最后亲手改造了他。`
      },
      sections: [
        {
          h: { en: 'Why Winston trusts him', zh: '温斯顿为什么信任他' },
          text: {
            en: `During the {@hate|Two Minutes Hate}, a daily ritual where Party members scream at the face of the enemy on a screen, a glance convinces Winston that O'Brien secretly hates the Party too [1]. Weeks later O'Brien approaches him in a corridor and gives him his address, which looks like a recruitment [2]. At O'Brien's flat, Winston and Julia drink to {@goldstein|Goldstein}, the Party's arch-enemy, and join his underground Brotherhood [3].`,
            zh: `在{@hate|两分钟仇恨}（党员每天对着屏幕上的敌人集体咒骂的仪式）中，一次对视让温斯顿确信，奥布莱恩也暗中憎恨党[1]。几周后，奥布莱恩在走廊里主动接近他、留下地址，看起来像一次招募[2]。在奥布莱恩家中，温斯顿和朱莉娅为党的头号敌人{@goldstein|戈德斯坦}干杯，加入了他的地下组织兄弟会[3]。`
          }
        },
        {
          h: { en: 'Who he really is', zh: '他到底是谁' },
          text: {
            en: `In reality O'Brien is the Party's most dedicated servant [4]. After the arrest he takes over Winston's re-education in the {@love|Ministry of Love} himself [5]. He holds up four fingers until Winston sees five [6], and explains that the Party does not make martyrs; it changes its enemies before it kills them [7]. To Winston he is at once torturer and the only person who truly understands him, which is why the trap works.`,
            zh: `实际上，奥布莱恩是党最忠诚的仆人[4]。温斯顿被捕后，他在{@love|爱情部}亲自接手温斯顿的再教育[5]。他举起四根手指，直到温斯顿看见五根[6]，并告诉他：党不制造殉道者，而是在杀死敌人之前先改造他们[7]。对温斯顿来说，他既是施刑者，也是唯一真正理解自己的人，这正是陷阱能成功的原因。`
          }
        }
      ],
      cites: [
        ev(ID.obrien, "Winston is convinced that O'Brien shares his secret hatred of the Party", '温斯顿确信，奥布莱恩也与他一样憎恨党'),
        ev(ID.obrien, 'a calculated act that appears to be a recruitment', '这一精心设计的举动，看起来像是一种招募'),
        ev(ID.winston, 'drink a health to Emmanuel Goldstein, and enrol in the Brotherhood', '为埃曼纽尔·戈德斯坦干杯，并加入了兄弟会'),
        ev(ID.obrien, "In reality, O'Brien is the Party's most dedicated servant", '实际上，奥布莱恩是党最忠诚的仆人'),
        ev(ID.winston, "O'Brien then takes over his re-education personally", '随后，奥布莱恩亲自接手他的再教育'),
        ev(ID.winston, 'holding up four fingers, he demands that Winston see five', '奥布莱恩伸出四根手指，要温斯顿说出看到的是五根'),
        ev(ID.winston, 'there are no martyrdoms in this place, and that the Party does not destroy its enemies but changes them', '这里没有殉道者，党也不消灭敌人，而是改造他们')
      ],
      chain: [
        { entity: ID.hate, cite: 1, label: { en: 'A glance at the Hate', zh: '仇恨会上的对视' } },
        { entity: ID.obrien, cite: 2, label: { en: 'He leaves his address', zh: '留下地址' } },
        { entity: ID.goldstein, cite: 3, label: { en: 'A toast to Goldstein', zh: '为戈德斯坦干杯' } },
        { entity: ID.love, cite: 5, label: { en: 'He takes over the re-education', zh: '亲自接手改造' } },
        { entity: ID.twoPlusTwo, cite: 6, label: { en: 'Four fingers become five', zh: '四根手指变成五根' } }
      ],
      follow: ['betray', 'twoplustwo']
    },
    {
      id: 'twoplustwo',
      q: { en: 'What does 2 + 2 = 5 mean in the book?', zh: '“2+2=5”在书里是什么意思？' },
      match: { en: ['2+2', '2 + 2', 'five'], zh: ['2+2', '2 + 2', '二加二'] },
      read: [ID.twoPlusTwo, ID.winston, ID.doublethink],
      lead: {
        en: `It is the Party's power to decide what is true, in its barest form. Not just making you say something false, but making you believe it.`,
        zh: `它是党“说什么就是什么”这种权力最赤裸的形式：不只是让你说错，而是让你真心相信错的。`
      },
      sections: [
        {
          h: { en: 'What Winston believed', zh: '温斯顿原来相信什么' },
          text: {
            en: `In the secret {@diary|diary} that starts his rebellion, Winston writes the opposite axiom: freedom is the freedom to say that two plus two make four [1]. For him, plain arithmetic is the last thing the Party cannot rewrite.`,
            zh: `在开启他反叛的那本秘密{@diary|日记}里，温斯顿写下了相反的公理：自由就是说二加二等于四的自由[1]。对他来说，最朴素的算术是党无法改写的最后一样东西。`
          }
        },
        {
          h: { en: 'How the Party takes it away', zh: '党怎么把它拿走' },
          text: {
            en: `In the {@love|Ministry of Love}, {@obrien|O'Brien} holds up four fingers and asks how many Winston sees [2]. Saying "five" to stop the pain is not enough; Winston has to actually see five. The skill behind this is {@doublethink|doublethink}, believing two contradictory truths at the same time [3]. That is why the formula is the most concentrated expression of the Party's power to dictate reality [4].`,
            zh: `在{@love|爱情部}，{@obrien|奥布莱恩}举起四根手指，问温斯顿看到几根[2]。为了止痛而说“五根”还不够，他必须真的看见五根。背后的能力叫{@doublethink|双重思想}：同时相信两个相互矛盾的真理[3]。所以这个算式是党支配现实之权力最集中的体现[4]。`
          }
        },
        {
          h: { en: 'How it ends', zh: '结局' },
          text: {
            en: `Released, Winston traces "2 + 2 = 5" in the dust of a café table [5]. The man who once defended two plus two make four ends by loving the power that destroyed him: he loved Big Brother [6].`,
            zh: `获释后，温斯顿在咖啡馆桌上的灰尘里写下“2 + 2 = 5”[5]。那个曾捍卫二加二等于四的人，最终爱上了毁掉自己的权力：他爱老大哥[6]。`
          }
        }
      ],
      cites: [
        ev(ID.twoPlusTwo, 'Freedom is the freedom to say that two plus two make four. If that is granted, all else follows.', '自由就是说二加二等于四的自由。如果这一点被承认，其他一切便随之而来。'),
        ev(ID.twoPlusTwo, "O'Brien, holding up four fingers, demands that Winston say how many he sees", '奥布莱恩举起四根手指，要求温斯顿说出他看到了几根'),
        ev(ID.twoPlusTwo, 'The book defines doublethink as a mental discipline whose goal is to believe two contradictory truths at the same time.', '这本书把双重思想定义为一种心理纪律，其目标是同时相信两个相互矛盾的真理。'),
        ev(ID.twoPlusTwo, "the single most concentrated expression of the Party's power to dictate reality", '是乔治·奥威尔《一九八四》中党支配现实之权力最集中的体现'),
        ev(ID.winston, "He traces '2 + 2 = 5' in the dust on the café table", '他用手指在咖啡馆桌子的灰尘上画下“2 + 2 = 5”'),
        ev(ID.winston, 'he had won the victory over himself, and he loved Big Brother.', '他赢得了对自己的胜利，他爱老大哥。')
      ],
      chain: [
        { entity: ID.diary, cite: 1, label: { en: 'Two plus two make four', zh: '日记：二加二等于四' } },
        { entity: ID.love, cite: 2, label: { en: 'Four fingers', zh: '四根手指' } },
        { entity: ID.chestnut, cite: 5, label: { en: '2 + 2 = 5 in the dust', zh: '灰尘里的 2+2=5' } },
        { entity: ID.lovedBB, cite: 6, label: { en: 'He loves Big Brother', zh: '他爱老大哥' } }
      ],
      follow: ['betray', 'obrien']
    }
  ];

  window.READIPEDIA_DEMO2 = {
    ids: ID,
    relations: { [ID.winston]: winstonRelations },
    answers
  };
})();
