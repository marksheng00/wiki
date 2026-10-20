/* Readify library, mirrored from readifyai.com/zh/books (October 2026).
   Each book carries its Chinese and English title and author; `slug` is the
   Chinese title Readify uses in its URLs. Categories with no books are left
   out of the page. `local` marks the book this site hosts in full. */
window.READIPEDIA_LIBRARY = {
  local: {
    id: '1984',
    zh: { title: '一九八四', author: '乔治·奥威尔' },
    en: { title: 'Nineteen Eighty-Four', author: 'George Orwell' },
    cover: './assets/images/book-doc-books-001-1984-4b9fbb7c4955-cover.jpg',
    category: 'fiction',
    year: 1949
  },

  // Readify's own order for the opening shelf of its library page.
  popular: [
    '伊甸之东', '与龙共舞', '奥德赛', '权力的游戏', '基督山伯爵', '神曲', '魔戒',
    '哈利·波特与混血王子', '简·爱', '哈利·波特与密室', '沙丘',
    '哈利·波特与阿兹卡班的囚徒', '它', '第二十二条军规'
  ],

  // All 16 Readify categories, in Readify's order.
  categories: [
    { id: 'fiction', zh: '虚构小说', en: 'Fiction' },
    { id: 'literature', zh: '文学', en: 'Literature' },
    { id: 'biography', zh: '人物传记', en: 'Biography' },
    { id: 'business', zh: '商业', en: 'Business' },
    { id: 'self-help', zh: '个人成长', en: 'Self-help' },
    { id: 'psychology', zh: '心理', en: 'Psychology' },
    { id: 'history', zh: '历史', en: 'History' },
    { id: 'philosophy', zh: '哲学宗教', en: 'Philosophy & Religion' },
    { id: 'society', zh: '社会文化', en: 'Society & Culture' },
    { id: 'politics', zh: '政治军事', en: 'Politics & Military' },
    { id: 'arts', zh: '艺术', en: 'Arts' },
    { id: 'science', zh: '科学技术', en: 'Science & Technology' },
    { id: 'computing', zh: '计算机', en: 'Computing' },
    { id: 'health', zh: '医学健康', en: 'Health & Medicine' },
    { id: 'lifestyle', zh: '生活百科', en: 'Lifestyle' },
    { id: 'education', zh: '教育学习', en: 'Education' }
  ],

  books: [
    // Fiction
    { slug: '伊甸之东', cat: 'fiction', zh: ['伊甸之东', '约翰·斯坦贝克'], en: ['East of Eden', 'John Steinbeck'] },
    { slug: '与龙共舞', cat: 'fiction', zh: ['与龙共舞', '乔治·R·R·马丁'], en: ['A Dance with Dragons', 'George R. R. Martin'] },
    { slug: '权力的游戏', cat: 'fiction', zh: ['权力的游戏', '乔治·R·R·马丁'], en: ['A Game of Thrones', 'George R. R. Martin'] },
    { slug: '基督山伯爵', cat: 'fiction', zh: ['基督山伯爵', '亚历山大·大仲马'], en: ['The Count of Monte Cristo', 'Alexandre Dumas'] },
    { slug: '魔戒', cat: 'fiction', zh: ['魔戒', 'J.R.R.托尔金'], en: ['The Lord of the Rings', 'J. R. R. Tolkien'] },
    { slug: '哈利·波特与混血王子', cat: 'fiction', zh: ['哈利·波特与混血王子', 'J.K.罗琳'], en: ['Harry Potter and the Half-Blood Prince', 'J. K. Rowling'] },
    { slug: '简·爱', cat: 'fiction', zh: ['简·爱', '夏洛蒂·勃朗特'], en: ['Jane Eyre', 'Charlotte Brontë'] },
    { slug: '哈利·波特与密室', cat: 'fiction', zh: ['哈利·波特与密室', 'J.K.罗琳'], en: ['Harry Potter and the Chamber of Secrets', 'J. K. Rowling'] },
    { slug: '沙丘', cat: 'fiction', zh: ['沙丘', '弗兰克·赫伯特'], en: ['Dune', 'Frank Herbert'] },
    { slug: '哈利·波特与阿兹卡班的囚徒', cat: 'fiction', zh: ['哈利·波特与阿兹卡班的囚徒', 'J.K.罗琳'], en: ['Harry Potter and the Prisoner of Azkaban', 'J. K. Rowling'] },
    { slug: '它', cat: 'fiction', zh: ['它', '斯蒂芬·金'], en: ['It', 'Stephen King'] },
    { slug: '第二十二条军规', cat: 'fiction', zh: ['第二十二条军规', '约瑟夫·海勒'], en: ['Catch-22', 'Joseph Heller'] },

    // Literature
    { slug: '奥德赛', cat: 'literature', zh: ['奥德赛', '荷马'], en: ['The Odyssey', 'Homer'] },
    { slug: '神曲', cat: 'literature', zh: ['神曲', '但丁·阿利吉耶里'], en: ['The Divine Comedy', 'Dante Alighieri'] },
    { slug: '欲望号街车', cat: 'literature', zh: ['欲望号街车', '田纳西·威廉姆斯'], en: ['A Streetcar Named Desire', 'Tennessee Williams'] },
    { slug: '推销员之死', cat: 'literature', zh: ['推销员之死', '阿瑟·米勒'], en: ['Death of a Salesman', 'Arthur Miller'] },
    { slug: '父亲', cat: 'literature', zh: ['父亲', '弗洛里安·泽勒'], en: ['The Father', 'Florian Zeller'] },
    { slug: '无事生非', cat: 'literature', zh: ['无事生非', '威廉·莎士比亚'], en: ['Much Ado About Nothing', 'William Shakespeare'] },
    { slug: '《埃涅阿斯纪》', cat: 'literature', zh: ['埃涅阿斯纪', '维吉尔'], en: ['The Aeneid', 'Virgil'] },

    // Biography
    { slug: '《我仍在这里》', cat: 'biography', zh: ['我仍在这里', '马塞洛·鲁本斯·派瓦'], en: ["I'm Still Here", 'Marcelo Rubens Paiva'] },
    { slug: '史上最伟大的啤酒之旅：一段关于友谊、忠诚与战争的回忆录', cat: 'biography', zh: ['史上最伟大的啤酒之旅', '约翰·“奇克”·多诺休', '一段关于友谊、忠诚与战争的回忆录'], en: ['The Greatest Beer Run Ever', 'John "Chickie" Donohue', 'A Memoir of Friendship, Loyalty, and War'] },
    { slug: '关于四个男人的44章', cat: 'biography', zh: ['关于四个男人的44章', 'B.B.伊斯顿'], en: ['44 Chapters About 4 Men', 'B. B. Easton'] },
    { slug: '盐之路', cat: 'biography', zh: ['盐之路', '雷诺·温恩'], en: ['The Salt Path', 'Raynor Winn'] },
    { slug: '大声女人：一个女人的自我成长与觉醒', cat: 'biography', zh: ['大声女人', '林迪·韦斯特', '一个女人的自我成长与觉醒'], en: ['Shrill', 'Lindy West', 'Notes from a Loud Woman'] },
    { slug: '疼痛难免', cat: 'biography', zh: ['疼痛难免', '亚当·凯'], en: ['This Is Going to Hurt', 'Adam Kay'] },
    { slug: '美丽男孩：一个父亲陪伴儿子走出毒瘾的心路历程', cat: 'biography', zh: ['美丽男孩', '戴维·谢夫', '一个父亲陪伴儿子走出毒瘾的心路历程'], en: ['Beautiful Boy', 'David Sheff', "A Father's Journey Through His Son's Addiction"] },

    // Self-help
    { slug: '疯狂妈妈：不太正常生活的9个步骤', cat: 'self-help', zh: ['疯狂妈妈', '汉娜·基利', '不太正常生活的9个步骤'], en: ['Crazy Mom', 'Hannah Keeley', '9 Steps to a Not-So-Normal Life'] },
    { slug: '《秘密》', cat: 'self-help', zh: ['秘密', '朗达·拜恩'], en: ['The Secret', 'Rhonda Byrne'] },
    { slug: '微小而美好的事物：关于爱与生命的建议', cat: 'self-help', zh: ['微小而美好的事物', '谢丽尔·斯特雷德', '关于爱与生命的建议'], en: ['Tiny Beautiful Things', 'Cheryl Strayed', 'Advice on Love and Life'] },

    // Psychology
    { slug: '思考，快与慢', cat: 'psychology', zh: ['思考，快与慢', '丹尼尔·卡尼曼'], en: ['Thinking, Fast and Slow', 'Daniel Kahneman'] },
    { slug: '改变你的心智：迷幻药与意识新科学', cat: 'psychology', zh: ['改变你的心智', '迈克尔·波伦', '迷幻药与意识新科学'], en: ['How to Change Your Mind', 'Michael Pollan', 'The New Science of Psychedelics'] },
    { slug: '死后的世界', cat: 'psychology', zh: ['死后的世界', '雷蒙德·穆迪'], en: ['Life After Life', 'Raymond Moody'] },

    // History
    { slug: '孟买黑手党女王', cat: 'history', zh: ['孟买黑手党女王', '侯赛因·扎伊迪'], en: ['Mafia Queens of Mumbai', 'S. Hussain Zaidi'] },
    { slug: '花月杀手：奥塞奇族谋杀案与FBI的诞生', cat: 'history', zh: ['花月杀手', '大卫·格雷恩', '奥塞奇族谋杀案与FBI的诞生'], en: ['Killers of the Flower Moon', 'David Grann', 'The Osage Murders and the Birth of the FBI'] },
    { slug: '最后的决斗', cat: 'history', zh: ['最后的决斗', '埃里克·贾格尔'], en: ['The Last Duel', 'Eric Jager'] },
    { slug: '在天堂的旗帜下', cat: 'history', zh: ['在天堂的旗帜下', '乔恩·克拉考尔'], en: ['Under the Banner of Heaven', 'Jon Krakauer'] },
    { slug: '门格勒的消失', cat: 'history', zh: ['门格勒的消失', '奥利维耶·盖兹'], en: ['The Disappearance of Josef Mengele', 'Olivier Guez'] },
    { slug: '船上的男孩：九个美国青年与一场改变命运的奥运会', cat: 'history', zh: ['船上的男孩', '丹尼尔·詹姆斯·布朗', '九个美国青年与一场改变命运的奥运会'], en: ['The Boys in the Boat', 'Daniel James Brown', 'Nine Americans and Their Epic Quest for Gold'] },
    { slug: '我将消失在黑暗中：一个女人对金州杀手的执着追踪', cat: 'history', zh: ['我将消失在黑暗中', '米歇尔·麦克纳马拉', '一个女人对金州杀手的执着追踪'], en: ["I'll Be Gone in the Dark", 'Michelle McNamara', "One Woman's Obsessive Search for the Golden State Killer"] },

    // Philosophy and religion
    { slug: '《薄伽梵歌》', cat: 'philosophy', zh: ['薄伽梵歌', '毗耶娑'], en: ['The Bhagavad Gita', 'Vyasa'] },
    { slug: '西西弗神话', cat: 'philosophy', zh: ['西西弗神话', '阿尔贝·加缪'], en: ['The Myth of Sisyphus', 'Albert Camus'] },
    { slug: '摩尔门经', cat: 'philosophy', zh: ['摩尔门经', '约瑟·斯密'], en: ['The Book of Mormon', 'Joseph Smith'] },
    { slug: '启示录', cat: 'philosophy', zh: ['启示录', '拔摩岛的约翰'], en: ['The Book of Revelation', 'John of Patmos'] },
    { slug: '约伯记', cat: 'philosophy', zh: ['约伯记', '吉尔伯特·基思·切斯特顿'], en: ['The Book of Job', 'G. K. Chesterton'] },
    { slug: '查拉图斯特拉如是说', cat: 'philosophy', zh: ['查拉图斯特拉如是说', '弗里德里希·尼采'], en: ['Thus Spoke Zarathustra', 'Friedrich Nietzsche'] },
    { slug: '视差之见', cat: 'philosophy', zh: ['视差之见', '斯拉沃热·齐泽克'], en: ['The Parallax View', 'Slavoj Žižek'] },

    // Society and culture
    { slug: '正义的慈悲：美国司法中的苦难与救赎', cat: 'society', zh: ['正义的慈悲', '布莱恩·史蒂文森', '美国司法中的苦难与救赎'], en: ['Just Mercy', 'Bryan Stevenson', 'A Story of Justice and Redemption'] },
    { slug: '游牧人生：美国新穷人的生存之道', cat: 'society', zh: ['游牧人生', '杰西卡·布鲁德', '美国新穷人的生存之道'], en: ['Nomadland', 'Jessica Bruder', 'Surviving America in the Twenty-First Century'] },
    { slug: '她说：揭露性骚扰真相，点燃＃MeToo运动', cat: 'society', zh: ['她说', '乔迪·坎托、梅根·图黑', '揭露性骚扰真相，点燃＃MeToo运动'], en: ['She Said', 'Jodi Kantor, Megan Twohey', 'Breaking the Story That Helped Ignite a Movement'] },
    { slug: '所有权战争：谁拥有你？', cat: 'society', zh: ['所有权战争', '乔·迪克森', '谁拥有你？'], en: ['Ownership Wars', 'Joe Dickson', 'Who Owns You?'] },
    { slug: '夜间清洁工', cat: 'society', zh: ['夜间清洁工', '弗洛朗丝·奥贝纳'], en: ['The Night Cleaner', 'Florence Aubenas'] },

    // Politics and military
    { slug: '黑鹰坠落', cat: 'politics', zh: ['黑鹰坠落', '马克·鲍登'], en: ['Black Hawk Down', 'Mark Bowden'] },
    { slug: '君主论', cat: 'politics', zh: ['君主论', '尼科洛·马基雅维利'], en: ['The Prince', 'Niccolò Machiavelli'] },
    { slug: '乌托邦', cat: 'politics', zh: ['乌托邦', '托马斯·莫尔'], en: ['Utopia', 'Thomas More'] },

    // Arts
    { slug: '西区故事', cat: 'arts', zh: ['西区故事', '莱昂纳德·伯恩斯坦'], en: ['West Side Story', 'Leonard Bernstein'] },
    { slug: '《混沌之王：撒旦金属地下世界的血腥崛起》', cat: 'arts', zh: ['混沌之王', '迪德里克·瑟德林、迈克尔·莫伊尼汉', '撒旦金属地下世界的血腥崛起'], en: ['Lords of Chaos', 'Didrik Søderlind, Michael Moynihan', 'The Bloody Rise of the Satanic Metal Underground'] },
    { slug: '《流行文化中的吸血鬼史》', cat: 'arts', zh: ['流行文化中的吸血鬼史', '维奥莱特·芬恩'], en: ['A History of the Vampire in Popular Culture', 'Violet Fenn'] },

    // Science and technology
    { slug: '鲸：巨兽的传奇', cat: 'science', zh: ['鲸', '菲利普·霍尔', '巨兽的传奇'], en: ['Leviathan, or The Whale', 'Philip Hoare'] },
    { slug: '与狼共度', cat: 'science', zh: ['与狼共度', '法利·莫厄特'], en: ['Never Cry Wolf', 'Farley Mowat'] },

    // Health and medicine
    { slug: '成瘾剂量：美国阿片类药物危机的真相', cat: 'health', zh: ['成瘾剂量', '贝丝·梅西', '美国阿片类药物危机的真相'], en: ['Dopesick', 'Beth Macy', 'Dealers, Doctors, and the Drug Company that Addicted America'] },
    { slug: '血疫：埃博拉的故事', cat: 'health', zh: ['血疫', '理查德·普雷斯顿', '埃博拉的故事'], en: ['The Hot Zone', 'Richard Preston', 'The Terrifying True Story of the Origins of Ebola'] },
    { slug: '肾脏疾病、血液透析与移植中的丙型肝炎', cat: 'health', zh: ['肾脏疾病、血液透析与移植中的丙型肝炎', '何塞·M·莫拉莱斯'], en: ['Hepatitis C in Renal Disease, Hemodialysis and Transplantation', 'José M. Morales'] },
    { slug: '《纪念医院五日：卡特里娜飓风中的生死抉择》', cat: 'health', zh: ['纪念医院五日', '谢丽·芬克', '卡特里娜飓风中的生死抉择'], en: ['Five Days at Memorial', 'Sheri Fink', 'Life and Death in a Storm-Ravaged Hospital'] },

    // Lifestyle
    { slug: '《宝可梦GO：终极初学者指南——Kindle电子书技巧与窍门：如何成为最优秀的宝可梦训练家：这本Kindle电子书将解答你未解决的问题》', cat: 'lifestyle', zh: ['宝可梦GO：终极初学者指南', '肖恩·埃利', '如何成为最优秀的宝可梦训练家'], en: ['Pokémon Go: The Ultimate Beginner’s Guide', 'Sean Ely', 'How to Become the Best Pokémon Trainer'] },
    { slug: '《科幻、奇幻与恐怖类型及评级指南》', cat: 'lifestyle', zh: ['科幻、奇幻与恐怖类型及评级指南', '布卢·泰森'], en: ['Science Fiction, Fantasy and Horror Genre and Rating Guide', 'Blue Tyson'] },
    { slug: '《魔兽世界：争霸艾泽拉斯》游戏指南（非官方）', cat: 'lifestyle', zh: ['魔兽世界：争霸艾泽拉斯游戏指南', '职业玩家', '非官方'], en: ['World of Warcraft: Battle for Azeroth Game Guide', 'Pro Gamer', 'Unofficial'] },

    // Education
    { slug: '我们玩得开心吗？', cat: 'education', zh: ['我们玩得开心吗？', '凯·威利斯、玛丽安·巴克纳姆·布林利'], en: ['Are We Having Fun Yet?', 'Kay Willis, Maryann Bucknum Brinley'] }
  ],

  // Readify's "hot entries": its most-read wiki entries right now.
  entries: [
    { book: '伊甸之东', type: 'character', zh: ['查尔斯·特拉斯克', '查尔斯·特拉斯克是约翰·斯坦贝克《伊甸之东》中亚当·特拉斯克暴躁、不受爱的同父异母兄弟。他拥有巨大的体力、嫉妒心以及爱与杀意的能力，他的一生因对父亲塞勒斯绝望而单恋的爱以及与亚当的痛苦竞争而定义。他的遗产——通过吝啬的劳作积累并在遗嘱中留给包括兄弟疏远妻子在内的财富——成为下一代核心的道德和经济纠葛。'], en: ['Charles Trask', "Charles Trask is Adam Trask's volatile, unloved half-brother in John Steinbeck's East of Eden. Immensely strong, jealous and capable of both love and murderous rage, he is defined by a desperate, unrequited love for their father Cyrus and a bitter rivalry with Adam. The fortune he hoards through miserly labour, and leaves in his will to his brother and his brother's estranged wife, becomes the moral and financial knot at the heart of the next generation."] },
    { book: '伊甸之东', type: 'character', zh: ['詹姆斯·格鲁', '詹姆斯·格鲁是约翰·斯坦贝克《伊甸之东》中一个次要但关键的角色，一位年轻的拉丁语教师，他与青春期少女凯茜·埃姆斯短暂而激烈的交往以他的自杀告终。他的故事早期就令人震惊地展示了凯茜的操纵能力以及她利用成人欲望和弱点的本领，揭示了她从年轻时起就携带的破坏性力量。'], en: ['James Grew', "James Grew is a minor but pivotal figure in East of Eden: a young Latin teacher whose brief, intense involvement with the teenage Cathy Ames ends in his suicide. His story is an early, shocking display of Cathy's gift for manipulation and for exploiting adult desire and weakness, revealing the destructive force she has carried since youth."] },
    { book: '伊甸之东', type: 'location', zh: ['萨利纳斯制冰厂', '萨利纳斯制冰厂是亚当·特拉斯克在生菜生意失败后购买的，成为一项规模不大但稳定的生意，占据了他的时间并提供微薄收入。这家工厂不仅是商业企业，更是亚当在个人灾难后缓慢恢复过程中的心理锚点，后来也成为他儿子卡尔试图通过与威尔·汉密尔顿进行豆类投机来弥补过错的地点。'], en: ['Salinas Ice Plant', 'Adam Trask buys the Salinas ice plant after his lettuce venture fails, and it becomes a small but steady business that fills his days and brings a modest income. More than a business, the plant anchors Adam through his slow recovery from personal disaster, and later becomes the place where his son Cal tries to make amends through a bean speculation with Will Hamilton.'] },
    { book: '伊甸之东', type: 'character', zh: ['爱丽丝·特拉斯克', '爱丽丝·特拉斯克是塞勒斯·特拉斯克的第二任妻子，也是亚当·特拉斯克和查尔斯·特拉斯克的继母。她是一个安静、勤劳且病入膏肓的女人，忍受着家庭奴役和情感忽视的生活，只在罕见、隐秘的快乐时刻找到自己唯一的慰藉。她在特拉斯克家中的存在，由她因肺结核而默默承受的痛苦、她一丝不苟的家务操持，以及她作为丈夫与继子之间暴力动态的被动观察者所定义，最终成为支撑家庭却无声无息、不被赏识的劳作的辛酸象征。'], en: ['Alice Trask', "Alice Trask is Cyrus Trask's second wife and stepmother to Adam and Charles. A quiet, hard-working and gravely ill woman, she endures a life of domestic servitude and emotional neglect, finding her only comfort in rare, secret moments of pleasure. Her silent suffering from tuberculosis, her meticulous housekeeping and her place as a passive witness to the violence between her husband and stepsons make her a poignant symbol of the unseen, unthanked labour that holds a family up."] },
    { book: '伊甸之东', type: 'character', zh: ['凯茜·埃姆斯', '凯茜·埃姆斯，后化名凯特·特拉斯克，是约翰·斯坦贝克《伊甸之东》中的核心反派角色，一个深不可测、充满谜团的邪恶人物，其行为推动了小说对原罪、被拒绝以及道德选择可能性的探索。从童年起，她就表现出完全缺乏良知，利用自己天真无邪的外表和对人性弱点的冷酷理解，操纵、利用并摧毁周围的人。她精心策划的残忍行为最终导致她枪击丈夫亚当·特拉斯克、遗弃双胞胎儿子，并成为一家残酷妓院的老鸨，使她成为怪物的化身和特拉斯克家族悲剧的催化剂。'], en: ['Cathy Ames', "Cathy Ames, later Kate Trask, is the central antagonist of East of Eden: an unfathomable, enigmatic figure of evil whose actions drive the novel's exploration of original sin, rejection and the possibility of moral choice. From childhood she shows a complete absence of conscience, using her innocent looks and a cold grasp of human weakness to manipulate, use and destroy those around her. Her calculated cruelty leads her to shoot her husband Adam, abandon her twin sons and run a brutal brothel, making her the embodiment of the monstrous and the catalyst of the Trask family's tragedy."] },
    { book: '伊甸之东', type: 'character', zh: ['培根先生', '培根先生是《伊甸之东》中一个次要但具有象征意义的人物，他是县监督员，也是艾布拉·培根的父亲。他代表了萨利纳斯传统、注重地位、道德自满的小资产阶级。他短暂的出场凸显了特拉斯克家族麻烦的真实性与镇上当权者表面体面之间的对比，他的行为——尤其是在亚当经济失败后与特拉斯克家族疏远——暴露了一个由外表和经济地位支配的社区中社会接纳的条件性。'], en: ['Mr. Bacon', "Mr. Bacon is a minor but symbolic figure in East of Eden: the county supervisor and father of Abra Bacon. He stands for Salinas's conventional, status-conscious and morally complacent middle class. His brief appearances set the real troubles of the Trasks against the surface respectability of the town's establishment, and his distancing from the family after Adam's financial failure exposes how conditional acceptance is in a community ruled by appearances and money."] },
    { book: '伊甸之东', type: 'character', zh: ['亚当·特拉斯克', '亚当·特拉斯克是约翰·斯坦贝克《伊甸之东》中的核心男性主角，他的一生被一系列深重的失落以及一段漫长而缓慢的走向自我认知和道德自主的旅程所定义。他出生在康涅狄格州一个严酷的家庭，受制于欺诈成性的父亲和暴力的兄弟，通过参军和十年的流浪寻求逃避，却因与怪物般的凯茜·埃姆斯结婚而彻底破碎。她的遗弃和谋杀未遂使他多年情感麻木，直到塞缪尔·汉密尔顿和他的中国仆人李的干预逐渐唤醒了他。亚当最后的举动——对他充满负罪感的儿子卡尔低语希伯来语单词“Timshel”（意为“你可以”）——代表了他对人类自由和选择可能性的最终接纳，将他从一个被动的受害者转变为一个救赎恩典的形象。'], en: ['Adam Trask', "Adam Trask is the central male protagonist of East of Eden, a man defined by a series of profound losses and a long, slow journey toward self-knowledge and moral agency. Born into a harsh Connecticut household under a fraudulent father and a violent brother, he seeks escape in the army and a decade of wandering, only to be shattered by his marriage to the monstrous Cathy Ames. Her desertion and attempt on his life leave him numb for years, until Samuel Hamilton and his Chinese servant Lee slowly bring him back. His last act, whispering the Hebrew word “timshel” (“thou mayest”) to his guilt-ridden son Cal, is his final embrace of human freedom and choice, and turns him from a passive victim into a figure of redemptive grace."] },
    { book: '伊甸之东', type: 'event', zh: ['费伊去世', '费伊，萨利纳斯一家妓院的善良老鸨，被凯特（凯茜·埃姆斯）慢慢毒死。凯特以冷酷、精心的心理和肉体谋杀，系统地接管了她的房子、遗嘱和她的生活。'], en: ["Faye's Death", 'Faye, the kindly madam of a Salinas brothel, is slowly poisoned by Kate (Cathy Ames). Through a cold, meticulous psychological and physical murder, Kate systematically takes over her house, her will and her life.'] },
    { book: '伊甸之东', type: 'character', zh: ['李', '李是约翰·斯坦贝克《伊甸之东》中特拉斯克家族的中裔仆人、代理父母和哲学知己。他不仅仅是厨师或管家，更是家庭道德和智慧的中心，在双胞胎卡尔和阿伦的母亲凯茜抛弃他们后抚养他们长大，并成为小说核心主题——希伯来语单词“timshel”（意为“你可以”）的主要阐释者，该词肯定了人类在罪恶面前的选择力量。他沉静的智慧、语言的转换和深沉的忠诚使他成为最直接阐述本书关于自由意志和道德责任论点的角色。'], en: ['Lee', "Lee is the Trask family's Chinese-American servant, surrogate parent and philosophical confidant in East of Eden. Far more than a cook or housekeeper, he is the moral and intellectual centre of the household: he raises the twins Cal and Aron after their mother Cathy abandons them, and he is the main interpreter of the novel's central idea, the Hebrew word “timshel” (“thou mayest”), which affirms the human power of choice in the face of sin. His quiet wisdom, his shifts of language and his deep loyalty make him the character who states the book's argument about free will and moral responsibility most directly."] }
  ]
};
