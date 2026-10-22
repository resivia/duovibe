/* ═══════════════════════════════════════════════════════════════════
   DuoVibe question banks — exactly 100 items per game (15 banks).

   Generated file: edit build/normalise_banks.py, not this by hand.
   Shapes:
     secretGuess   string[]                            hidden word to guess
     mindMeld      {word}                              linked-word round
     compatQuiz    {question,answer}                   answer is unused by the UI
     percentage    {question,context}                  0-100 guess
     wouldRather   {question,optionA,optionB}          A vs B
     redGreenFlag  {scenario,flagType:'red'|'green'}
     hotTakes      {statement,agreePercent}
     vibeSlider    {scenario,context}                  0-100 scale
     bucketList    {idea,category}
     truthOrDare   {type:'truth'|'dare',content}
     flashPoll     {question,options[]}
     wordStorm     {category}
     spyInTheCrowd {category,commonWord,spyWord}
     blindRank     string[5]                           five items to rank
     dares         {text}                              streak penalty
   ═══════════════════════════════════════════════════════════════════ */
window.GAME_BANKS = {
 wouldRather:[
{"question":"Text them first or wait for them to text?","optionA":"Text first","optionB":"Wait for them"},{"question":"Public affection or keep it private?","optionA":"Public PDA","optionB":"Keep it private"},{"question":"Meet parents early or wait until serious?","optionA":"Meet early","optionB":"Wait until serious"},
{"question":"Share passwords or keep phones private?","optionA":"Share passwords","optionB":"Keep private"},{"question":"Double date often or just us two?","optionA":"Double dates","optionB":"Just us two"},{"question":"Long distance or short distance but boring?","optionA":"Long distance","optionB":"Boring but close"},
{"question":"Plan every date or go with the flow?","optionA":"Plan everything","optionB":"Go with flow"},{"question":"Say I love you first or wait for them?","optionA":"Say it first","optionB":"Wait for them"},{"question":"Fancy restaurant or food truck?","optionA":"Fancy restaurant","optionB":"Food truck"},
{"question":"Cook together at home or order takeout?","optionA":"Cook together","optionB":"Order takeout"},{"question":"Try exotic cuisine or stick to comfort food?","optionA":"Exotic cuisine","optionB":"Comfort food"},{"question":"Brunch date or late night diner?","optionA":"Brunch","optionB":"Late night diner"},
{"question":"Luxury resort or backpack and explore?","optionA":"Luxury resort","optionB":"Backpack explore"},{"question":"Road trip with no plan or fully planned?","optionA":"No plan road trip","optionB":"Fully planned"},{"question":"Beach vacation or mountain cabin?","optionA":"Beach","optionB":"Mountain cabin"},
{"question":"International flight alone or local staycation?","optionA":"Fly alone","optionB":"Local staycation"},{"question":"Cruise ship or camping in woods?","optionA":"Cruise ship","optionB":"Camping"},{"question":"Visit historical landmarks or chase nightlife?","optionA":"Historical landmarks","optionB":"Nightlife"},
{"question":"Live in big city or countryside?","optionA":"Big city","optionB":"Countryside"},{"question":"Own a house or rent luxury apartment?","optionA":"Own house","optionB":"Rent luxury"},{"question":"Early bird 5am or night owl 3am?","optionA":"Early bird","optionB":"Night owl"},
{"question":"Minimalist 50 items or hoarder full house?","optionA":"Minimalist","optionB":"Hoarder"},{"question":"Never cook again or never eat out again?","optionA":"Never cook","optionB":"Never eat out"},{"question":"Live without AC or without heating?","optionA":"No AC","optionB":"No heating"},
{"question":"Party of 100+ or intimate gathering of 5?","optionA":"Big party","optionB":"Intimate 5"},{"question":"Be life of party or quiet observer?","optionA":"Life of party","optionB":"Quiet observer"},{"question":"Have 1 best friend or 100 acquaintances?","optionA":"1 best friend","optionB":"100 acquaintances"},
{"question":"Always host or always be the guest?","optionA":"Always host","optionB":"Always guest"},{"question":"Go to every wedding or skip all events?","optionA":"Go to all","optionB":"Skip all"},{"question":"Speak in front of 1000 or sing karaoke solo?","optionA":"Public speaking","optionB":"Karaoke solo"},
{"question":"Always tell brutal truth or tell white lies?","optionA":"Brutal truth","optionB":"White lies"},{"question":"Know when everyone dies or how everyone dies?","optionA":"When they die","optionB":"How they die"},{"question":"Save 1 loved one or 100 strangers?","optionA":"1 loved one","optionB":"100 strangers"},
{"question":"Rich and alone or poor with love?","optionA":"Rich alone","optionB":"Poor with love"},{"question":"Invisible for a day or read minds for a day?","optionA":"Invisible","optionB":"Read minds"},{"question":"Erase 1 mistake from past or see 100 years future?","optionA":"Erase mistake","optionB":"See future"},
{"question":"Everyone lie to you or you lie to everyone?","optionA":"They lie to you","optionB":"You lie"},{"question":"Know date of death or cause of death?","optionA":"Date of death","optionB":"Cause of death"},{"question":"Only watch Marvel or only DC?","optionA":"Marvel only","optionB":"DC only"},
{"question":"Live in Harry Potter world or Star Wars?","optionA":"Harry Potter","optionB":"Star Wars"},{"question":"Famous on TikTok or famous on YouTube?","optionA":"TikTok famous","optionB":"YouTube famous"},{"question":"Only listen to hip-hop or only country?","optionA":"Hip-hop","optionB":"Country"},
{"question":"Meet celebrity crush or favorite author?","optionA":"Crush","optionB":"Author"},{"question":"Star in Hollywood movie or Netflix series?","optionA":"Hollywood movie","optionB":"Netflix series"},{"question":"TikTok influencer or Netflix actor?","optionA":"TikTok influencer","optionB":"Netflix actor"},
{"question":"Have every Disney+ movie or every Netflix show?","optionA":"Disney+","optionB":"Netflix"},{"question":"Never use smartphone or never use computer?","optionA":"No smartphone","optionB":"No computer"},{"question":"Unlimited free WiFi or unlimited free electricity?","optionA":"Free WiFi","optionB":"Free electricity"},
{"question":"Latest iPhone yearly or latest PlayStation yearly?","optionA":"iPhone yearly","optionB":"PlayStation yearly"},{"question":"AI does all work or AI does all chores?","optionA":"AI does work","optionB":"AI does chores"},{"question":"Live without internet or without TV?","optionA":"No internet","optionB":"No TV"},
{"question":"Smart home all devices or self-driving car only?","optionA":"Smart home","optionB":"Self-driving car"},{"question":"Upload brain to cloud or download skills like Matrix?","optionA":"Upload brain","optionB":"Download skills"},{"question":"Only eat pizza for life or only tacos?","optionA":"Pizza only","optionB":"Tacos only"},
{"question":"Never eat dessert or never eat savory?","optionA":"No dessert","optionB":"No savory"},{"question":"Cook every meal for 1 month or eat fast food 1 month?","optionA":"Cook everything","optionB":"Fast food month"},{"question":"Only drink coffee for life or only tea?","optionA":"Coffee only","optionB":"Tea only"},
{"question":"Hot sauce on everything or no seasoning ever?","optionA":"Hot sauce everything","optionB":"No seasoning"},{"question":"Michelin star restaurant or street food in 10 countries?","optionA":"Michelin","optionB":"Street food tour"},{"question":"Never eat chocolate again or never eat cheese?","optionA":"No chocolate","optionB":"No cheese"},
{"question":"Only eat breakfast foods or only dinner foods?","optionA":"Breakfast only","optionB":"Dinner only"},{"question":"Skydive from 15000 feet or deep sea dive 100 feet?","optionA":"Skydive","optionB":"Deep sea dive"},{"question":"Bungee jump off bridge or zip line rainforest?","optionA":"Bungee jump","optionB":"Zip line"},
{"question":"Climb Everest or dive Great Barrier Reef?","optionA":"Climb Everest","optionB":"Dive reef"},{"question":"Sleep in haunted house alone or cage dive shark?","optionA":"Haunted house","optionB":"Shark cage"},{"question":"Hot air balloon or helicopter mountain tour?","optionA":"Hot air balloon","optionB":"Helicopter tour"},
{"question":"Explore abandoned city or discover hidden cave?","optionA":"Abandoned city","optionB":"Hidden cave"},{"question":"Race car on track or fly fighter jet 1 hour?","optionA":"Race car","optionB":"Fighter jet"},{"question":"Walk on moon or visit bottom of ocean?","optionA":"Walk on moon","optionB":"Ocean bottom"},
{"question":"Make 10M hate job or 50K love job?","optionA":"10M hate job","optionB":"50K love job"},{"question":"Own boss no salary or work for someone guaranteed?","optionA":"Own boss","optionB":"Work for someone"},{"question":"Work from home forever or office with great colleagues?","optionA":"Work from home","optionB":"Office with friends"},
{"question":"1 career 50 years or change careers every 5 years?","optionA":"1 career","optionB":"Change careers"},{"question":"CEO major company or founder small startup?","optionA":"CEO major company","optionB":"Founder startup"},{"question":"Travel for work weekly or never travel for work?","optionA":"Travel weekly","optionB":"Never travel for work"},
{"question":"Work 4 hours/day for life or 12 hours/day for 5 years then free?","optionA":"4 hours forever","optionB":"12 hours 5 years then free"},{"question":"Famous unrecognized talent or unknown respected expert?","optionA":"Famous talent","optionB":"Unknown expert"},{"question":"Watched every movie ever or read every book ever?","optionA":"Every movie","optionB":"Every book"},
{"question":"Attend every music festival or every sports event?","optionA":"Music festivals","optionB":"Sports events"},{"question":"Front row every concert or backstage every show?","optionA":"Front row","optionB":"Backstage"},{"question":"Play every video game ever or watch every movie?","optionA":"Play games","optionB":"Watch movies"},
{"question":"Only watch comedy for life or only horror?","optionA":"Comedy only","optionB":"Horror only"},{"question":"Meet all favorite celebrities or date celebrity crush?","optionA":"Meet celebs","optionB":"Date crush"},{"question":"Win lottery or find wallet 10K monthly?","optionA":"Win lottery","optionB":"10K monthly wallet"},
{"question":"Go to every Disney park or every Universal park?","optionA":"Disney parks","optionB":"Universal parks"},{"question":"Winter forever or summer forever?","optionA":"Winter forever","optionB":"Summer forever"},{"question":"No social media or no TV?","optionA":"No social media","optionB":"No TV"},
{"question":"Always ten minutes early or ten minutes late?","optionA":"Early","optionB":"Late"},{"question":"A house with no wifi or no heating?","optionA":"No wifi","optionB":"No heating"},{"question":"Only sweet food or only savoury?","optionA":"Sweet only","optionB":"Savoury only"},
{"question":"Live in the city or the countryside?","optionA":"City","optionB":"Countryside"},{"question":"A partner who's a great cook or a great listener?","optionA":"Great cook","optionB":"Great listener"},{"question":"Only text or only call for a year?","optionA":"Only text","optionB":"Only call"},
{"question":"Never travel again or never stay home again?","optionA":"Never travel","optionB":"Never stay home"},{"question":"Dream job far away or a boring job nearby?","optionA":"Dream job far","optionB":"Boring job nearby"},{"question":"Give up coffee or give up chocolate?","optionA":"Coffee","optionB":"Chocolate"},
{"question":"Know every thought of your partner or keep total privacy?","optionA":"Know their thoughts","optionB":"Total privacy"},{"question":"Always be on time or always be forgiven?","optionA":"Always on time","optionB":"Always forgiven"},{"question":"Live without music or without movies?","optionA":"No music","optionB":"No movies"},
{"question":"Four hours of sleep and rich, or eight hours and average?","optionA":"Four hours, rich","optionB":"Eight hours, average"}
 ],
 redGreenFlag:[
{"scenario":"Reply to texts in 2 seconds every time","flagType":"red"},{"scenario":"Remember small details you mentioned weeks ago","flagType":"green"},{"scenario":"Laugh at your bad jokes even when not funny","flagType":"green"},
{"scenario":"Get angry when you spend time with friends","flagType":"red"},{"scenario":"Introduce you to friends proudly","flagType":"green"},{"scenario":"Check your phone without asking","flagType":"red"},
{"scenario":"Celebrate your small wins enthusiastically","flagType":"green"},{"scenario":"Make you feel guilty for having life outside them","flagType":"red"},{"scenario":"Respect boundaries without pushing","flagType":"green"},
{"scenario":"Insist on knowing where you are always","flagType":"red"},{"scenario":"Say I love you within first week","flagType":"red"},{"scenario":"Show up when you're sick or in need","flagType":"green"},
{"scenario":"Criticize your family or friends","flagType":"red"},{"scenario":"Support your dreams and goals genuinely","flagType":"green"},{"scenario":"Keep score of who does what","flagType":"red"},
{"scenario":"Apologize sincerely when they mess up","flagType":"green"},{"scenario":"Make you feel like walking on eggshells","flagType":"red"},{"scenario":"Ask about your day and actually listen","flagType":"green"},
{"scenario":"Compare you to their ex constantly","flagType":"red"},{"scenario":"Make you feel like best version of yourself","flagType":"green"},{"scenario":"Pressure you into things not ready for","flagType":"red"},
{"scenario":"Happy when you succeed at something","flagType":"green"},{"scenario":"Isolate you from people they don't like","flagType":"red"},{"scenario":"Bring coffee or food when you're having bad day","flagType":"green"},
{"scenario":"Get jealous of your success or attention","flagType":"red"},{"scenario":"Remember your favorite food without being told","flagType":"green"},{"scenario":"Guilt-trip you to get their way","flagType":"red"},
{"scenario":"Make future plans with you naturally","flagType":"green"},{"scenario":"Refuse to talk about feelings","flagType":"red"},{"scenario":"Hold your hand in public proudly","flagType":"green"},
{"scenario":"Control who you can follow online","flagType":"red"},{"scenario":"Compliment you genuinely and specifically","flagType":"green"},{"scenario":"Make every conversation about themselves","flagType":"red"},
{"scenario":"Ask your opinion on important decisions","flagType":"green"},{"scenario":"Dismiss your feelings as overreacting","flagType":"red"},{"scenario":"Say we instead of I when talking future","flagType":"green"},
{"scenario":"Refuse to use protection or discuss it","flagType":"red"},{"scenario":"Patient when you're struggling with something","flagType":"green"},{"scenario":"Yell or throw things during arguments","flagType":"red"},
{"scenario":"Try to understand your perspective when disagree","flagType":"green"},{"scenario":"Keep secrets but expect full access to your life","flagType":"red"},{"scenario":"Encourage you to pursue own hobbies","flagType":"green"},
{"scenario":"Make fun of you in front of others","flagType":"red"},{"scenario":"Notice when you change appearance or mood","flagType":"green"},{"scenario":"Blame you for their bad mood","flagType":"red"},
{"scenario":"Send good morning and good night messages consistently","flagType":"green"},{"scenario":"Refuse to commit or talk about where things going","flagType":"red"},{"scenario":"Make you feel excited to see them every time","flagType":"green"},
{"scenario":"Use affection as manipulation when want something","flagType":"red"},{"scenario":"Stand up for you when others treat you badly","flagType":"green"},{"scenario":"Dismiss your fears or anxieties as unimportant","flagType":"red"},
{"scenario":"Create inside jokes and special moments between you two","flagType":"green"},{"scenario":"Threaten to leave when don't get their way","flagType":"red"},{"scenario":"Remember important dates without reminders","flagType":"green"},
{"scenario":"Refuse to meet your friends or family","flagType":"red"},{"scenario":"Look into your eyes when you talk like truly see you","flagType":"green"},{"scenario":"Make you feel lucky to be with them","flagType":"green"},
{"scenario":"Refuse to compromise on anything","flagType":"red"},{"scenario":"Help you when moving or need physical help","flagType":"green"},{"scenario":"Refuse to use your correct pronouns or chosen name","flagType":"red"},
{"scenario":"Excited to introduce you as partner to new people","flagType":"green"},{"scenario":"Make you feel like have to earn their affection","flagType":"red"},{"scenario":"Celebrate your achievements louder than their own","flagType":"green"},
{"scenario":"Have unexplained gaps in stories about their day","flagType":"red"},{"scenario":"Comfortably quiet together without constant entertainment","flagType":"green"},{"scenario":"Refuse to discuss past relationships honestly","flagType":"red"},
{"scenario":"Learn your love language and speak it consistently","flagType":"green"},{"scenario":"Dismiss career or ambitions as not important","flagType":"red"},{"scenario":"Make you feel like enough exactly as you are","flagType":"green"},
{"scenario":"Get defensive whenever you ask simple question","flagType":"red"},{"scenario":"Remember what you said you wanted to try and suggest it","flagType":"green"},{"scenario":"Use silence as punishment when upset","flagType":"red"},
{"scenario":"Say I'm proud of you without being prompted","flagType":"green"},{"scenario":"Refuse to grow or work on themselves for relationship","flagType":"red"},{"scenario":"Notice and appreciate little things you do","flagType":"green"},
{"scenario":"Flirt with others openly even when together","flagType":"red"},{"scenario":"Remember coffee order perfectly after 3 dates","flagType":"green"},{"scenario":"Blame external factors for own mistakes","flagType":"red"},
{"scenario":"Prioritize safety and well-being consistently","flagType":"green"},{"scenario":"Refuse couples counseling or work on issues","flagType":"red"},{"scenario":"Make you laugh until stomach hurts regularly","flagType":"green"},
{"scenario":"Use money or gifts to compensate for bad behavior","flagType":"red"},{"scenario":"Respect need for alone time without taking personally","flagType":"green"},{"scenario":"Refuse to acknowledge harmful behavior when confronted","flagType":"red"},
{"scenario":"Kiss in way that makes you feel truly wanted","flagType":"green"},{"scenario":"Remembers your coffee order without asking","flagType":"green"},{"scenario":"Sends random \"thinking of you\" texts","flagType":"green"},
{"scenario":"Respects your boundaries without being asked twice","flagType":"green"},{"scenario":"Makes time for your friends and family","flagType":"green"},{"scenario":"Apologises properly and changes the behaviour","flagType":"green"},
{"scenario":"Listens to your boring stories all the way through","flagType":"green"},{"scenario":"Is proud when you succeed at something they don't care about","flagType":"green"},{"scenario":"Asks about your day and remembers the answer","flagType":"green"},
{"scenario":"Checks your phone \"just to be sure\"","flagType":"red"},{"scenario":"Makes plans without ever including you","flagType":"red"},{"scenario":"Gets angry when you spend time with friends","flagType":"red"},
{"scenario":"Never says thank you to service staff","flagType":"red"},{"scenario":"Says \"you're overreacting\" when you share feelings","flagType":"red"},{"scenario":"Keeps score of everything in the relationship","flagType":"red"},
{"scenario":"Flirts with other people \"as a joke\"","flagType":"red"}
 ],
 compatQuiz:[
{"question":"Do you believe in soulmates?","answer":"Yes"},{"question":"How do you show love?","answer":"Quality time"},{"question":"What's your love language?","answer":"Words of affirmation"},
{"question":"Quality or quantity?","answer":"Quality"},{"question":"How important is physical touch?","answer":"Very important"},{"question":"Believe in fate?","answer":"Yes"},
{"question":"Ideal first date?","answer":"Something casual"},{"question":"Handle conflict?","answer":"Talk it out"},{"question":"Introvert or extrovert?","answer":"Ambivert"},
{"question":"Believe in premarital counseling?","answer":"Yes"},{"question":"What matters most in partner?","answer":"Kindness"},{"question":"How important is physical attraction?","answer":"Important but not everything"},
{"question":"Believe in love at first sight?","answer":"Maybe"},{"question":"Dealbreaker?","answer":"Disrespect"},{"question":"How do you express affection?","answer":"Small gestures"},
{"question":"Believe in soul contracts?","answer":"Yes"},{"question":"Relationship goal?","answer":"Building something lasting"},{"question":"Family approval important?","answer":"Important"},
{"question":"Believe in twin flames?","answer":"Yes"},{"question":"Communication style?","answer":"Direct and honest"},{"question":"Believe in second chances?","answer":"Yes"},
{"question":"Biggest relationship fear?","answer":"Losing connection"},{"question":"Handle jealousy?","answer":"Talk openly"},{"question":"Believe in marriage?","answer":"Yes"},
{"question":"View on monogamy?","answer":"Commitment"},{"question":"Recharge how?","answer":"Time alone"},{"question":"Believe in gender roles?","answer":"No"},
{"question":"Love compatibility sign?","answer":"Understanding"},{"question":"Believe in astrology?","answer":"Interesting"},{"question":"How know you're in love?","answer":"Worry about their happiness"},
{"question":"Relationship priority?","answer":"Communication"},{"question":"Believe in compromise?","answer":"Yes"},{"question":"Makes you feel loved?","answer":"Being seen"},
{"question":"Believe in destiny?","answer":"Some things feel destined"},{"question":"Loyalty important?","answer":"Non-negotiable"},{"question":"Relationship strength?","answer":"Good listener"},
{"question":"Believe in couple workshops?","answer":"Yes"},{"question":"Handle stress in relationships?","answer":"Take space then return"},{"question":"Attachment style?","answer":"Secure"},
{"question":"Believe in love languages?","answer":"Yes"},{"question":"Relationship philosophy?","answer":"Love is a verb"},{"question":"Show appreciation how?","answer":"Say thank you"},
{"question":"Believe in growing together?","answer":"Absolutely"},{"question":"Relationship weakness?","answer":"Avoid hard conversations"},{"question":"Believe in relationship rules?","answer":"We make our own"},
{"question":"Honesty important?","answer":"Foundation"},{"question":"Relationship dream?","answer":"Growing old together"},{"question":"Believe in soulmate signs?","answer":"Yes"},
{"question":"Relationship hope?","answer":"Building something beautiful"},{"question":"Believe in relationship goals?","answer":"Yes"},{"question":"Define love?","answer":"Choosing each other"},
{"question":"Believe in checkpoints?","answer":"Yes"},{"question":"Relationship mantra?","answer":"We're on same team"},{"question":"Believe in counseling?","answer":"No shame"},
{"question":"Handle disagreements?","answer":"Listen first"},{"question":"Believe in rituals?","answer":"Yes"},{"question":"Relationship superpower?","answer":"Making partner feel safe"},
{"question":"Believe in growth?","answer":"Always growing"},{"question":"Trust important?","answer":"Everything"},{"question":"Believe in boundaries?","answer":"Yes"},
{"question":"Year one goal?","answer":"Strong foundation"},{"question":"Believe in expectations?","answer":"Yes"},{"question":"Handle changes?","answer":"Adapt and communicate"},
{"question":"Believe in traditions?","answer":"Create your own"},{"question":"Relationship value?","answer":"Emotional connection"},{"question":"Believe in milestones?","answer":"Yes"},
{"question":"Nurture relationship?","answer":"Small acts of love"},{"question":"Believe in timing?","answer":"Right person right time"},{"question":"Relationship principle?","answer":"Kindness wins"},
{"question":"Believe in contracts?","answer":"Implicit works"},{"question":"Handle uncertainty?","answer":"Have faith"},{"question":"Believe in intuition?","answer":"Gut feelings matter"},
{"question":"Relationship compass?","answer":"Mutual respect"},{"question":"Believe in narratives?","answer":"Our story matters"},{"question":"Create memories?","answer":"Be present"},
{"question":"Believe in legacy?","answer":"What we build"},{"question":"Relationship anchor?","answer":"Trust"},{"question":"Believe in evolution?","answer":"Always changing"},
{"question":"Measure success?","answer":"Happiness and growth"},{"question":"Believe in vulnerability?","answer":"Gateway to love"},{"question":"North star?","answer":"Choosing love daily"},
{"question":"Believe in balance?","answer":"Give and take"},{"question":"Celebrate wins?","answer":"Be grateful"},{"question":"What's the best way to spend a Sunday together?","answer":"Lazy morning"},
{"question":"Who said \"I love you\" first?","answer":"Me"},{"question":"What would your partner order for takeout?","answer":"Pizza"},{"question":"Which of you is the better driver?","answer":"Me"},
{"question":"Who's more likely to cry at a movie?","answer":"Both"},{"question":"What's your partner's dream holiday?","answer":"Beach"},{"question":"Who takes longer to get ready?","answer":"My partner"},
{"question":"What's the worst gift your partner could give you?","answer":"Socks"},{"question":"Who's more stubborn?","answer":"Me"},{"question":"What's your partner's comfort food?","answer":"Ice cream"},
{"question":"Who's better at keeping secrets?","answer":"Me"},{"question":"What would your partner do with a completely free day?","answer":"Sleep in"},{"question":"Which of you plans better dates?","answer":"Me"},
{"question":"What's your partner's biggest pet peeve?","answer":"Mess"},{"question":"Who's more likely to start a food fight?","answer":"Me"},{"question":"Which chore does your partner hate most?","answer":"Dishes"},
{"question":"Where would your partner most want to live?","answer":"City"}
 ],
 hotTakes:[
{"statement":"Ice cream is perfect dessert for every occasion","agreePercent":80},{"statement":"Dogs are better pets than cats","agreePercent":65},{"statement":"DC movies better than Marvel","agreePercent":30},
{"statement":"Netflix best original content","agreePercent":75},{"statement":"HBO Max better content than Netflix","agreePercent":35},{"statement":"Star Wars best sci-fi franchise","agreePercent":70},
{"statement":"Star Wars overrated","agreePercent":30},{"statement":"Harry Potter best book series","agreePercent":75},{"statement":"Video games legitimate art form","agreePercent":70},
{"statement":"Nintendo best game company","agreePercent":70},{"statement":"Anime legitimate cinema","agreePercent":75},{"statement":"R&B best genre for love songs","agreePercent":75},
{"statement":"Concert tickets too expensive","agreePercent":75},{"statement":"In-N-Out best burger chain","agreePercent":65},{"statement":"Mexican food best cuisine","agreePercent":70},
{"statement":"Tacos better than burritos","agreePercent":55},{"statement":"Pizza should have pineapple","agreePercent":60},{"statement":"Cereal definitely not soup","agreePercent":70},
{"statement":"Starbucks coffee overpriced","agreePercent":70},{"statement":"Pepsi or Coke better?","agreePercent":50},{"statement":"Coffee essential food group","agreePercent":75},
{"statement":"Tofu delicious","agreePercent":30},{"statement":"Beer best alcoholic drink","agreePercent":60},{"statement":"Margaritas best cocktail","agreePercent":65},
{"statement":"Personal trainers worth it","agreePercent":50},{"statement":"New Balance most comfortable","agreePercent":55},{"statement":"Tattoos addictive","agreePercent":60},
{"statement":"Makeup art form","agreePercent":60},{"statement":"Retinol game changer","agreePercent":60},{"statement":"Waxing long lasting","agreePercent":65},
{"statement":"Bath bombs fun","agreePercent":55},{"statement":"Lavender calming","agreePercent":70},{"statement":"Eucalyptus clearing","agreePercent":60},
{"statement":"Rose romantic","agreePercent":60},{"statement":"Almond nourishing","agreePercent":55},{"statement":"Olive oil hair","agreePercent":50},
{"statement":"Keto effective","agreePercent":50},{"statement":"Detox tea scam","agreePercent":50},{"statement":"Prebiotics food","agreePercent":50},
{"statement":"Hydrogen fuel","agreePercent":50},{"statement":"Sodium salt","agreePercent":50},{"statement":"Aluminum foil","agreePercent":50},
{"statement":"Calcium milk","agreePercent":50},{"statement":"Scandium rare","agreePercent":50},{"statement":"Titanium strong","agreePercent":50},
{"statement":"Zinc roof","agreePercent":50},{"statement":"Germanium chip","agreePercent":50},{"statement":"Palladium catalyst","agreePercent":50},
{"statement":"Tellurium rare","agreePercent":50},{"statement":"Lanthanum rare","agreePercent":50},{"statement":"Gadolinium MRI","agreePercent":50},
{"statement":"Holmium rare","agreePercent":50},{"statement":"Erbium fiber","agreePercent":50},{"statement":"Iridium hard","agreePercent":50},
{"statement":"Gold conductor","agreePercent":50},{"statement":"Bismuth crystal","agreePercent":50},{"statement":"Uranium fuel","agreePercent":50},
{"statement":"Plutonium bomb","agreePercent":50},{"statement":"Curium rare","agreePercent":50},{"statement":"Rutherfordium rare","agreePercent":50},
{"statement":"Seaborgium rare","agreePercent":50},{"statement":"Nihonium rare","agreePercent":50},{"statement":"Boxing best combat sport","agreePercent":50},
{"statement":"Golf relaxing and fun","agreePercent":50},{"statement":"CrossFit dangerous","agreePercent":50},{"statement":"Group fitness classes fun","agreePercent":50},
{"statement":"Basketball shoes should be stylish","agreePercent":50},{"statement":"Basketball shoes functional first","agreePercent":50},{"statement":"Crocs ugly","agreePercent":50},
{"statement":"Bold fashion best","agreePercent":50},{"statement":"Fast fashion convenient","agreePercent":50},{"statement":"Getting tan healthy","agreePercent":50},
{"statement":"Piercings too much","agreePercent":50},{"statement":"Makeup removing feels good","agreePercent":50},{"statement":"Primer necessary","agreePercent":50},
{"statement":"Cleanse toner moisturize","agreePercent":50},{"statement":"Vitamin C brightens","agreePercent":50},{"statement":"Eye cream necessary","agreePercent":50},
{"statement":"LED mask effective","agreePercent":50},{"statement":"Chemical peel effective","agreePercent":50},{"statement":"Laser treatment effective","agreePercent":50},
{"statement":"Botox temporary fix","agreePercent":50},{"statement":"Lip filler popular","agreePercent":50},{"statement":"Sugaring less painful","agreePercent":50},
{"statement":"Sugaring natural","agreePercent":50},{"statement":"Sugar free trend","agreePercent":50},{"statement":"Calorie counting effective","agreePercent":50},
{"statement":"Macro counting effective","agreePercent":50},{"statement":"Intuitive eating healthy","agreePercent":50},{"statement":"Juice cleanse unhealthy","agreePercent":50},
{"statement":"Caffeine metabolism","agreePercent":50},{"statement":"Ashwagandha stress","agreePercent":50},{"statement":"Hyaluronic acid skin","agreePercent":50},
{"statement":"Manganese bones","agreePercent":50},{"statement":"Nickel enzyme","agreePercent":50},{"statement":"Gallium rare","agreePercent":50},
{"statement":"Radium toxic","agreePercent":50},{"statement":"Americium radioactive","agreePercent":50},{"statement":"Praseodymium rare earth","agreePercent":50},
{"statement":"Samarium rare","agreePercent":50}
 ],
 bucketList:[
{"idea":"Reconnect with an old friend from high school","category":"reconnection"},{"idea":"Take a spontaneous weekend road trip","category":"adventure"},{"idea":"Cook a 3-course meal for your partner","category":"cooking"},
{"idea":"Learn to make the perfect cup of coffee","category":"skills"},{"idea":"Write a handwritten letter to someone important","category":"connection"},{"idea":"Go stargazing in a dark sky location","category":"nature"},
{"idea":"Try a cuisine you've never heard of","category":"food"},{"idea":"Take a dance class together","category":"activity"},{"idea":"Visit a nearby town you've never explored","category":"travel"},
{"idea":"Go to a museum or art gallery","category":"culture"},{"idea":"Have a picnic in a scenic spot","category":"outdoor"},{"idea":"Learn 5 phrases in a new language","category":"learning"},
{"idea":"Take a photography walk together","category":"creative"},{"idea":"Volunteer at a local charity","category":"giving"},{"idea":"Go ice skating or roller skating","category":"activity"},
{"idea":"Have a movie marathon of a favorite series","category":"entertainment"},{"idea":"Go to a comedy show","category":"entertainment"},{"idea":"Try a new hobby together","category":"growth"},
{"idea":"Create a time capsule to open in 5 years","category":"memory"},{"idea":"Go to an escape room","category":"activity"},{"idea":"Take a sunset walk on the beach","category":"romantic"},
{"idea":"Go to a live music performance","category":"music"},{"idea":"Recreate your first date","category":"romantic"},{"idea":"Learn to make a signature cocktail","category":"skills"},
{"idea":"Go bird watching","category":"nature"},{"idea":"Visit a historic site","category":"culture"},{"idea":"Have a game night with friends","category":"social"},
{"idea":"Go to an amusement park","category":"fun"},{"idea":"Try geocaching","category":"adventure"},{"idea":"Have a spa night at home","category":"relaxation"},
{"idea":"Learn a magical trick or card trick","category":"skills"},{"idea":"Go to a flea market or antique shop","category":"shopping"},{"idea":"Go kayaking or paddleboarding","category":"water"},
{"idea":"Take a pottery or ceramics class","category":"creative"},{"idea":"Stargaze with a telescope app","category":"nature"},{"idea":"Create a vision board together","category":"goals"},
{"idea":"Go thrift shopping and style each other","category":"fun"},{"idea":"Go to a botanical garden","category":"nature"},{"idea":"Have a fondue night","category":"food"},
{"idea":"Learn to surf or try watersports","category":"adventure"},{"idea":"Go to an outdoor concert","category":"music"},{"idea":"Take a ferry or boat ride","category":"travel"},
{"idea":"Go to a book signing or author event","category":"culture"},{"idea":"Go to a vineyard or winery","category":"travel"},{"idea":"Try axe throwing","category":"activity"},
{"idea":"Go to a paint and sip class","category":"creative"},{"idea":"Have a board game tournament","category":"fun"},{"idea":"Go to a science museum","category":"education"},
{"idea":"Take a scenic train ride","category":"travel"},{"idea":"Go to a haunted house or ghost tour","category":"adventure"},{"idea":"Create a scavenger hunt for each other","category":"romantic"},
{"idea":"Go to a car show","category":"culture"},{"idea":"Go to a fireworks display","category":"celebration"},{"idea":"Go to an immersive art exhibit","category":"culture"},
{"idea":"Go to a karaoke bar","category":"fun"},{"idea":"Take a mixology class","category":"skills"},{"idea":"Go to a cultural festival","category":"culture"},
{"idea":"Build something together with wood or LEGO","category":"creative"},{"idea":"Go to a cheese tasting","category":"food"},{"idea":"Try indoor rock climbing","category":"adventure"},
{"idea":"Go to a fashion museum","category":"culture"},{"idea":"Create a podcast episode together","category":"creative"},{"idea":"Go to a chocolate factory tour","category":"food"},
{"idea":"Go to a national park","category":"nature"},{"idea":"Go to a comic book convention","category":"culture"},{"idea":"Create a custom fragrance together","category":"creative"},
{"idea":"Go to a silent disco","category":"fun"},{"idea":"Go to a historical reenactment","category":"culture"},{"idea":"Try a hat or millinery class","category":"creative"},
{"idea":"Go to a candle making workshop","category":"creative"},{"idea":"Create a family tree together","category":"connection"},{"idea":"Go to a perfume museum","category":"culture"},
{"idea":"Try a truffle hunting experience","category":"food"},{"idea":"Go to an underwater museum","category":"culture"},{"idea":"Create a custom board game","category":"creative"},
{"idea":"Go to a retro arcade bar","category":"fun"},{"idea":"Try a virtual reality experience","category":"technology"},{"idea":"Go to a vintage market","category":"shopping"},
{"idea":"Create a custom scent","category":"creative"},{"idea":"Go to a moonshine distillery tour","category":"food"},{"idea":"Try a blacksmithing class","category":"skills"},
{"idea":"Go to a textile or weaving workshop","category":"creative"},{"idea":"Go to an underground speakeasy","category":"fun"},{"idea":"Try a foraging class","category":"food"},
{"idea":"Go to a lantern festival","category":"celebration"},{"idea":"Go to a floating market","category":"travel"},{"idea":"Go to a glass blowing demonstration","category":"culture"},
{"idea":"Create a custom recipe book","category":"creative"},{"idea":"Go to a lighthouse tour","category":"travel"},{"idea":"Create a custom star map of a special date","category":"romantic"},
{"idea":"Go to a tea tasting","category":"food"},{"idea":"Try a lock making or antique lock exhibition","category":"culture"},{"idea":"Go to an underground river or cave tour","category":"adventure"},
{"idea":"Create a custom playlist for your relationship","category":"romantic"},{"idea":"Go to a cultural dance performance","category":"culture"},{"idea":"Try a survival weekend","category":"adventure"},
{"idea":"Go to a floating restaurant","category":"food"},{"idea":"Create a custom love story book","category":"romantic"},{"idea":"Go to a hidden waterfall","category":"nature"},
{"idea":"Try a zip line canopy tour","category":"adventure"}
 ],
 truthOrDare:[
{"type":"truth","content":"What's your biggest relationship fear?"},{"type":"truth","content":"What was your first impression of me?"},{"type":"truth","content":"What's a secret you've never told anyone?"},
{"type":"truth","content":"What's the most embarrassing thing you've done for love?"},{"type":"truth","content":"What's a dream you've never shared?"},{"type":"truth","content":"What's the worst date you've ever been on?"},
{"type":"truth","content":"What's something you've lied about to impress someone?"},{"type":"truth","content":"What's your biggest turn-on?"},{"type":"truth","content":"What's your biggest turn-off?"},
{"type":"truth","content":"What's the most romantic thing you've ever done?"},{"type":"truth","content":"What's a goal you're too scared to pursue?"},{"type":"truth","content":"What's the best advice you've ever received?"},
{"type":"truth","content":"What's something you're deeply proud of?"},{"type":"truth","content":"What's a childhood memory that still affects you?"},{"type":"truth","content":"What's the most courageous thing you've done?"},
{"type":"truth","content":"What's a mistake you've learned the most from?"},{"type":"truth","content":"What's something you wish people understood about you?"},{"type":"truth","content":"What's the most adventurous thing you want to do?"},
{"type":"truth","content":"What's something you believe that most people disagree with?"},{"type":"truth","content":"What's the best compliment you've ever received?"},{"type":"truth","content":"What's the worst breakup you've experienced?"},
{"type":"truth","content":"What's something you're secretly jealous of?"},{"type":"truth","content":"What's a party you'll never forget?"},{"type":"truth","content":"What's the most impulsive decision you've made?"},
{"type":"truth","content":"What's something you're afraid to admit?"},{"type":"truth","content":"What's the most meaningful conversation you've had?"},{"type":"truth","content":"What's a song that always makes you emotional?"},
{"type":"truth","content":"What's the most fun you've ever had with a friend?"},{"type":"truth","content":"What's a fashion mistake you've made?"},{"type":"truth","content":"What's something you pretend to like but don't?"},
{"type":"truth","content":"What's the most risky thing you've ever done?"},{"type":"truth","content":"What's your perfect day look like?"},{"type":"truth","content":"What's a dealbreaker you won't compromise on?"},
{"type":"truth","content":"What's the most memorable kiss you've had?"},{"type":"truth","content":"What's something you've never done but want to?"},{"type":"truth","content":"What's the best thing about your personality?"},
{"type":"dare","content":"Send a flirty text to your secret crush right now"},{"type":"dare","content":"Let the group choose your next outfit from your closet"},{"type":"dare","content":"Do your best impression of someone in the room"},
{"type":"dare","content":"Do a TikTok dance without preparation"},{"type":"dare","content":"Call a random contact and sing happy birthday"},{"type":"dare","content":"Let someone draw on your face with marker"},
{"type":"dare","content":"Do 10 pushups right now"},{"type":"dare","content":"Post an embarrassing photo from your past on social media"},{"type":"dare","content":"Speak only in questions for 5 minutes"},
{"type":"dare","content":"Eat something spicy without drinking anything"},{"type":"dare","content":"Do a dramatic reading of your last text message"},{"type":"dare","content":"Hold a plank position for 30 seconds"},
{"type":"dare","content":"Speak in rhyme for the next 3 minutes"},{"type":"dare","content":"Do a fashion show with whatever's in your bag"},{"type":"dare","content":"Let the group film you doing something silly"},
{"type":"dare","content":"Send a voice message singing to someone"},{"type":"dare","content":"Compliment every person in the room sincerely"},{"type":"dare","content":"Eat a spoonful of a condiment you hate"},
{"type":"dare","content":"Text your ex (or oldest contact) 'hey' right now"},{"type":"dare","content":"Speak in a whisper for 5 minutes"},{"type":"dare","content":"Let the group choose your profile picture for a day"},
{"type":"dare","content":"Do a stand-up routine about your day"},{"type":"dare","content":"Run around the room pretending to be a character"},{"type":"dare","content":"Send a flirty photo to the group chat"},
{"type":"dare","content":"Do a magic trick (real or fake)"},{"type":"dare","content":"Wear something inside out for the rest of the night"},{"type":"dare","content":"Speak with your mouth full for 2 minutes"},
{"type":"dare","content":"Let someone give you a new nickname right now"},{"type":"dare","content":"Text your crush 'I had a dream about you'"},{"type":"dare","content":"Do a silly walk across the room"},
{"type":"dare","content":"Let the group choose your next dare"},{"type":"dare","content":"Make up a song about the person to your right"},{"type":"dare","content":"Do a 30-second dance battle"},
{"type":"dare","content":"Wear sunglasses indoors for 10 minutes"},{"type":"dare","content":"Let someone give you a one-star review of your personality"},{"type":"dare","content":"Send a meme to the person least likely to find it funny"},
{"type":"dare","content":"Do your best angry villain monologue"},{"type":"dare","content":"Speak in a foreign accent for 5 minutes"},{"type":"dare","content":"Let the group write a message you have to send"},
{"type":"dare","content":"Do a handstand or hold your legs up for 10 seconds"},{"type":"dare","content":"Act out a scene from a movie without speaking"},{"type":"dare","content":"Send a voice note rapping about the group"},
{"type":"dare","content":"Let someone else take your next selfie"},{"type":"dare","content":"Do a slow-motion dramatic walk"},{"type":"dare","content":"Speak only in movie quotes for 5 minutes"},
{"type":"dare","content":"Let the group choose your Spotify song for the next hour"},{"type":"dare","content":"Do a dramatic soap opera confession"},{"type":"dare","content":"Pretend to be a food critic reviewing the snacks"},
{"type":"dare","content":"Send a compliment to your crush's latest post"},{"type":"dare","content":"Do a comedy roast of yourself"},{"type":"dare","content":"Let the group give you 3 new personality traits"},
{"type":"dare","content":"Do a dramatic reading of the room's group chat"},{"type":"dare","content":"Speak backwards for 30 seconds"},{"type":"dare","content":"Let someone draw a mustache on your photo"},
{"type":"dare","content":"Do a dramatic proposal to an object in the room"},{"type":"dare","content":"Send a voice message whispering something flirty"},{"type":"dare","content":"Do a dramatic reading of a receipt"},
{"type":"dare","content":"Speak in an opera voice for 2 minutes"},{"type":"dare","content":"Let the group choose your next social media status"},{"type":"dare","content":"Do a dramatic reenactment of your worst date"},
{"type":"dare","content":"Send a flirty emoji story to your crush"},{"type":"dare","content":"Wear your clothes backwards for 10 minutes"},{"type":"dare","content":"Let someone else give you a makeover"},
{"type":"dare","content":"Do a dramatic reenactment of a childhood memory"}
 ],
 mindMeld:[
{"word":"Love"},{"word":"Heart"},{"word":"Dream"},
{"word":"Star"},{"word":"Moon"},{"word":"Ocean"},
{"word":"Fire"},{"word":"Rain"},{"word":"Home"},
{"word":"Family"},{"word":"Friend"},{"word":"Adventure"},
{"word":"Journey"},{"word":"Destiny"},{"word":"Soul"},
{"word":"Memory"},{"word":"Time"},{"word":"Eternity"},
{"word":"Freedom"},{"word":"Peace"},{"word":"Hope"},
{"word":"Courage"},{"word":"Magic"},{"word":"Mystery"},
{"word":"Chaos"},{"word":"Light"},{"word":"Darkness"},
{"word":"Sun"},{"word":"Sky"},{"word":"Earth"},
{"word":"Water"},{"word":"Wind"},{"word":"Storm"},
{"word":"Mountain"},{"word":"River"},{"word":"Forest"},
{"word":"Crystal"},{"word":"Diamond"},{"word":"Gold"},
{"word":"Silver"},{"word":"Treasure"},{"word":"Secret"},
{"word":"Promise"},{"word":"Trust"},{"word":"Betrayal"},
{"word":"Forgiveness"},{"word":"Redemption"},{"word":"Rebirth"},
{"word":"Transformation"},{"word":"Awakening"},{"word":"Truth"},
{"word":"Illusion"},{"word":"Reality"},{"word":"Imagination"},
{"word":"Creativity"},{"word":"Passion"},{"word":"Desire"},
{"word":"Wisdom"},{"word":"Knowledge"},{"word":"Curiosity"},
{"word":"Wonder"},{"word":"Joy"},{"word":"Sorrow"},
{"word":"Grief"},{"word":"Healing"},{"word":"Growth"},
{"word":"Change"},{"word":"Evolution"},{"word":"Cycles"},
{"word":"Balance"},{"word":"Harmony"},{"word":"Rhythm"},
{"word":"Flow"},{"word":"Connection"},{"word":"Bond"},
{"word":"Union"},{"word":"Together"},{"word":"Separation"},
{"word":"Distance"},{"word":"Longing"},{"word":"Waiting"},
{"word":"Strength"},{"word":"Victory"},{"word":"Resilience"},
{"word":"Survival"},{"word":"Abundance"},{"word":"Generosity"},
{"word":"Kindness"},{"word":"Compassion"},{"word":"Empathy"},
{"word":"Understanding"},{"word":"Acceptance"},{"word":"Unity"},
{"word":"Diversity"},{"word":"Community"},{"word":"Belonging"},
{"word":"Identity"},{"word":"Purpose"},{"word":"Vision"},
{"word":"Legacy"}
 ],
 vibeSlider:[
{"scenario":"First date at coffee shop","context":"Casual meeting"},{"scenario":"First date at fancy restaurant","context":"Formal"},{"scenario":"Reunion after 6 months apart","context":"Long distance reunion"},
{"scenario":"First time meeting parents","context":"Family introduction"},{"scenario":"Anniversary dinner","context":"Celebrating love"},{"scenario":"Getting caught in rain together","context":"Unexpected adventure"},
{"scenario":"Watching sunset on beach","context":"Romantic moment"},{"scenario":"Getting lost on road trip","context":"Adventure gone wrong"},{"scenario":"Dance floor at party","context":"Social energy"},
{"scenario":"Comfortable silence on couch","context":"Intimate comfort"},{"scenario":"First kiss","context":"Major milestone"},{"scenario":"Argue about something silly","context":"Minor conflict"},
{"scenario":"Comfort each other after bad day","context":"Emotional support"},{"scenario":"Planning future trip together","context":"Shared dreams"},{"scenario":"Meeting each other's best friends","context":"Social expansion"},
{"scenario":"Late night deep conversation","context":"Emotional intimacy"},{"scenario":"Laughing uncontrollably at something dumb","context":"Pure joy"},{"scenario":"Holding hands in public","context":"Affection display"},
{"scenario":"First time saying I love you","context":"Vulnerability"},{"scenario":"Surprise visit to their workplace","context":"Thoughtful gesture"},{"scenario":"Cooking disaster together","context":"Funny failure"},
{"scenario":"Perfect date night planned perfectly","context":"Ideal romance"},{"scenario":"Traveling to foreign country together","context":"Adventure"},{"scenario":"Getting sick and caring for each other","context":"Tender care"},
{"scenario":"First time staying overnight","context":"New territory"},{"scenario":"Meeting family for holidays","context":"Family integration"},{"scenario":"Running into an ex together","context":"Awkward tension"},
{"scenario":"Celebrating a major achievement","context":"Joyful pride"},{"scenario":"Quiet morning with coffee no phone","context":"Peaceful start"},{"scenario":"First time meeting online friends in person","context":"Digital to reality"},
{"scenario":"Getting a pet together","context":"New responsibility"},{"scenario":"Moving in together for first time","context":"Major step"},{"scenario":"Getting lost in new city","context":"Exploration"},
{"scenario":"Holiday shopping together","context":"Festive stress"},{"scenario":"First vacation without friends","context":"Just us"},{"scenario":"Cooking special meal together","context":"Creative collaboration"},
{"scenario":"Watching horror movie and holding hands","context":"Shared fear"},{"scenario":"Going to wedding as couple","context":"Official celebration"},{"scenario":"First time traveling alone together","context":"Independence"},
{"scenario":"Meeting each other's siblings","context":"Family expansion"},{"scenario":"Celebrating milestone birthday","context":"Reflective joy"},{"scenario":"Getting caught in thunderstorm","context":"Cozy tension"},
{"scenario":"Making up after serious fight","context":"Reconciliation"},{"scenario":"First time introducing as partner","context":"Commitment"},{"scenario":"Going to concert together","context":"Shared passion"},
{"scenario":"Spontaneous dance in kitchen","context":"Pure fun"},{"scenario":"Getting matching piercings","context":"Shared style"},{"scenario":"First time meeting in-laws","context":"Family pressure"},
{"scenario":"Planning surprise for each other","context":"Thoughtful secrecy"},{"scenario":"Getting promotion together","context":"Shared success"},{"scenario":"First time traveling with friends as couple","context":"Group integration"},
{"scenario":"Quiet evening with just talking","context":"Deep connection"},{"scenario":"Getting matching jewelry","context":"Symbolic bond"},{"scenario":"First time cooking for each other's families","context":"Family acceptance"},
{"scenario":"Celebrating surviving tough year","context":"Resilience"},{"scenario":"Taking spontaneous detour on trip","context":"Adventure"},{"scenario":"Playing competitive game together","context":"Playful rivalry"},
{"scenario":"First time showing vulnerability","context":"Emotional opening"},{"scenario":"Getting matching keychains or symbols","context":"Subtle bond"},{"scenario":"Celebrating personal achievement together","context":"Shared pride"},
{"scenario":"First time traveling for specific event","context":"Purposeful trip"},{"scenario":"Meeting each other's online gaming friends","context":"Digital crossover"},{"scenario":"Creating a tradition together","context":"Lasting ritual"},
{"scenario":"First time meeting each other's mentors","context":"Influence recognition"},{"scenario":"Getting tattoo together","context":"Permanent commitment"},{"scenario":"Celebrating anniversary in new place","context":"Fresh romance"},
{"scenario":"First time traveling with babies or kids","context":"Family life"},{"scenario":"Making major life decision together","context":"Shared responsibility"},{"scenario":"Getting matching scars or stories","context":"Shared experience"},
{"scenario":"First time introducing to neighbors","context":"Community integration"},{"scenario":"Celebrating getting through crisis","context":"Survival bond"},{"scenario":"First time traveling to dream destination","context":"Dream come true"},
{"scenario":"Making up secret language or code","context":"Unique bond"},{"scenario":"First time showing each other's creative work","context":"Creative sharing"},{"scenario":"Celebrating friendship anniversary","context":"Friendship love"},
{"scenario":"First time traveling with large group","context":"Social blend"},{"scenario":"Getting matching tattoos different languages","context":"Cultural bond"},{"scenario":"First time meeting pet's vet together","context":"Caregiving"},
{"scenario":"Celebrating creative project completion","context":"Achievement"},{"scenario":"First time traveling by train together","context":"Scenic journey"},{"scenario":"Sharing life-changing secret","context":"Deep trust"},
{"scenario":"Getting matching scars same accident","context":"Trauma bond"},{"scenario":"First time celebrating away from home","context":"Independence"},{"scenario":"Celebrating creative collaboration","context":"Joint creation"},
{"scenario":"First time meeting spiritual community","context":"Faith sharing"},{"scenario":"Making shared bucket list","context":"Future dreaming"},{"scenario":"Getting matching bracelets or charms","context":"Symbolic connection"},
{"scenario":"First time celebrating holiday new tradition","context":"Tradition creation"},{"scenario":"Sharing fears and phobias session","context":"Vulnerability"},{"scenario":"Getting matching birthstone gifts","context":"Personal symbol"},
{"scenario":"First time traveling with pet","context":"Family expansion"},{"scenario":"Celebrating overcoming shared challenge","context":"Triumph"},{"scenario":"Making shared time capsule","context":"Future self"},
{"scenario":"Getting matching constellation jewelry","context":"Cosmic bond"},{"scenario":"First time celebrating cultural holiday","context":"Cultural exchange"},{"scenario":"Sharing childhood photo album","context":"Origin sharing"},
{"scenario":"Getting matching coordinates jewelry","context":"Place bond"},{"scenario":"First time traveling wellness retreat","context":"Self care"},{"scenario":"Celebrating launching joint project","context":"Shared work"},
{"scenario":"Making shared vision board","context":"Future alignment"}
 ],
 percentage:[
{"question":"What percentage cheat in relationships?","context":"Relationship stats"},{"question":"What percentage marriages end in divorce?","context":"Marriage facts"},{"question":"What percentage have secret social media?","context":"Digital behavior"},
{"question":"What percentage share passwords?","context":"Trust levels"},{"question":"What percentage lied on dating profile?","context":"Online dating"},{"question":"What percentage reconnected with ex?","context":"Past relationships"},
{"question":"What percentage had crush on friend?","context":"Friend zone"},{"question":"What percentage believe in love at first sight?","context":"Romance beliefs"},{"question":"What percentage sent drunk text?","context":"Impulsive behavior"},
{"question":"What percentage stalked ex online?","context":"Digital obsession"},{"question":"What percentage faked being busy?","context":"Avoidance"},{"question":"What percentage cried over relationship?","context":"Emotional pain"},
{"question":"What percentage forgave major betrayal?","context":"Forgiveness"},{"question":"What percentage considered breakup but didn't?","context":"Relationship doubt"},{"question":"What percentage posted about relationship?","context":"Public love"},
{"question":"What percentage deleted photos after breakup?","context":"Digital cleanup"},{"question":"What percentage changed relationship status?","context":"Status updates"},{"question":"What percentage used dating app while in relationship?","context":"Cheating"},
{"question":"What percentage been catfished?","context":"Online deception"},{"question":"What percentage dreamed about ex?","context":"Dream psychology"},{"question":"What percentage compared relationship to others?","context":"Comparison"},
{"question":"What percentage bought gift to apologize?","context":"Gift apologies"},{"question":"What percentage kept ex's belongings?","context":"Holding on"},{"question":"What percentage wrote unsent letter?","context":"Unspoken words"},
{"question":"What percentage had crush on best friend?","context":"Friend love"},{"question":"What percentage lied about age online?","context":"Profile deception"},{"question":"What percentage deleted app after finding someone?","context":"Commitment"},
{"question":"What percentage sent risky photo?","context":"Digital risk"},{"question":"What percentage dreamed about marriage?","context":"Dream marriage"},{"question":"What percentage checked ex's new relationship?","context":"Post-breakup"},
{"question":"What percentage changed profile picture?","context":"Image management"},{"question":"What percentage used filter to look better?","context":"Digital enhancement"},{"question":"What percentage faked happiness in photo?","context":"Photo fakery"},
{"question":"What percentage posted to make ex jealous?","context":"Revenge posting"},{"question":"What percentage blocked ex?","context":"Digital blocking"},{"question":"What percentage looked at ex's new partner?","context":"Stalking curiosity"},
{"question":"What percentage saved screenshots?","context":"Digital memories"},{"question":"What percentage forwarded risqué text?","context":"Gossip sharing"},{"question":"What percentage had long phone call with crush?","context":"Late night talks"},
{"question":"What percentage fell asleep on phone?","context":"Intimate sleep"},{"question":"What percentage sent voice message?","context":"Voice intimacy"},{"question":"What percentage recorded voice to practice?","context":"Practice messages"},
{"question":"What percentage used emojis for feelings?","context":"Digital emotions"},{"question":"What percentage used specific emoji repeatedly?","context":"Emoji signals"},{"question":"What percentage analyzed text timing?","context":"Digital vigilance"},
{"question":"What percentage screenshotted sweet message?","context":"Memory keeping"},{"question":"What percentage saved number without texting?","context":"Hope keeping"},{"question":"What percentage researched someone before meeting?","context":"Digital detective"},
{"question":"What percentage Googled someone after meeting?","context":"Post-meeting"},{"question":"What percentage checked social media after date?","context":"Post-date"},{"question":"What percentage posted vague status after breakup?","context":"Subtle signaling"},
{"question":"What percentage posted about moving on?","context":"Moving on"},{"question":"What percentage used song to express feelings?","context":"Music expression"},{"question":"What percentage made playlist for someone?","context":"Playlist love"},
{"question":"What percentage cried to relationship song?","context":"Music therapy"},{"question":"What percentage sent song with no explanation?","context":"Mysterious music"},{"question":"What percentage used movie reference?","context":"Movie language"},
{"question":"What percentage quoted book?","context":"Literary love"},{"question":"What percentage wrote poetry?","context":"Poetic feelings"},{"question":"What percentage kept relationship journal?","context":"Journal feelings"},
{"question":"What percentage drew someone?","context":"Artistic love"},{"question":"What percentage took photo without them knowing?","context":"Secret photography"},{"question":"What percentage kept old photo?","context":"Old photos"},
{"question":"What percentage framed a photo?","context":"Framed love"},{"question":"What percentage used lock screen photo?","context":"Phone love"},{"question":"What percentage used wallpaper of someone?","context":"Digital presence"},
{"question":"What percentage printed a photo?","context":"Physical memory"},{"question":"What percentage bought gift without occasion?","context":"Random gifts"},{"question":"What percentage made handmade gift?","context":"Handmade love"},
{"question":"What percentage cooked special meal?","context":"Cooking love"},{"question":"What percentage planned surprise?","context":"Surprise planning"},{"question":"What percentage kept date memento?","context":"Date memento"},
{"question":"What percentage saved ticket stub?","context":"Ticket memory"},{"question":"What percentage kept receipt from special moment?","context":"Receipt memory"},{"question":"What percentage wrote handwritten letter?","context":"Handwritten love"},
{"question":"What percentage sent physical letter?","context":"Old school love"},{"question":"What percentage kept letter from someone?","context":"Letter keeping"},{"question":"What percentage framed letter?","context":"Letter framing"},
{"question":"What percentage read letter multiple times?","context":"Letter rereading"},{"question":"What percentage memorized partner's words?","context":"Memory keeping"},{"question":"What percentage repeated partner's words in head?","context":"Mental replay"},
{"question":"What percentage dreamed about conversation?","context":"Dream conversations"},{"question":"What percentage wished they said something differently?","context":"Regret words"},{"question":"What percentage rehearsed conversation?","context":"Conversation prep"},
{"question":"What percentage practiced in mirror?","context":"Mirror practice"},{"question":"What percentage recorded voice to send later?","context":"Voice prep"},{"question":"What percentage deleted and resent message?","context":"Message editing"},
{"question":"What percentage waited to send message?","context":"Message timing"},{"question":"What percentage typed and deleted message?","context":"Message deleting"},{"question":"What percentage sent message at 3am?","context":"Late night"},
{"question":"What percentage sent message immediately after thinking of someone?","context":"Impulse"},{"question":"What percentage pretended not to care?","context":"Cool front"},{"question":"What percentage checked for reply constantly?","context":"Reply checking"},
{"question":"What percentage analyzed message meaning?","context":"Message analysis"},{"question":"What percentage read message multiple times?","context":"Message rereading"},{"question":"What percentage screenshotted to show friend?","context":"Message sharing"},
{"question":"What percentage saved message as memory?","context":"Message saving"},{"question":"What percentage printed message?","context":"Message printing"},{"question":"What percentage kept conversation forever?","context":"Text memory"},
{"question":"What percentage deleted conversation but kept screenshots?","context":"Partial deleting"}
 ],
 blindRank:[
["Pizza","Tacos","Sushi","Burgers","Pasta"],["Dogs","Cats","Birds","Fish","Reptiles"],["Summer","Winter","Spring","Fall","Rainy Season"],
["Strawberries","Bananas","Apples","Mangoes","Watermelon"],["Netflix","Disney+","HBO Max","Prime Video","YouTube"],["Coffee","Tea","Soda","Juice","Smoothies"],
["Beach","Mountains","City","Countryside","Desert"],["Comedy movies","Action movies","Horror movies","Romance movies","Sci-fi movies"],["Pizza","Burgers","Sushi","Tacos","Ramen"],
["Harry Potter","Star Wars","Marvel","Lord of the Rings","Avatar"],["iPhone","Samsung","Google Pixel","OnePlus","Motorola"],["Red","Blue","Green","Purple","Orange"],
["Chocolate","Vanilla","Strawberry","Mint","Cookies and Cream"],["Snapchat","Instagram","TikTok","Twitter","Facebook"],["Pop music","Hip-hop","Rock","Country","R&B"],
["Nike","Adidas","Puma","Reebok","New Balance"],["iPhone","MacBook","iPad","Apple Watch","AirPods"],["Mario","Sonic","Link","Pikachu","Pac-Man"],
["Netflix","YouTube","Twitch","Hulu","Disney+"],["Chocolate chip cookies","Oatmeal cookies","Sugar cookies","Snickerdoodles","Brownies"],["Spaghetti","Mac and cheese","Lasagna","Ravioli","Alfredo"],
["French fries","Onion rings","Mozzarella sticks","Wings","Queso"],["Coffee","Espresso","Latte","Cappuccino","Americano"],["T-shirt","Hoodie","Sweater","Jacket","Blazer"],
["Sneakers","Boots","Sandals","Loafers","Heels"],["Harry Potter","Twilight","Hunger Games","Divergent","Percy Jackson"],["Stranger Things","The Office","Friends","Brooklyn 99","The Mandalorian"],
["Action figures","Trading cards","LEGO sets","Funko Pops","Hot Wheels"],["Lasagna","Spaghetti","Ravioli","Fettuccine","Penne"],["Dog","Cat","Horse","Rabbit","Hamster"],
["Beach vacation","Mountain cabin","City trip","Camping trip","Cruise"],["Disney movies","Pixar movies","Marvel movies","Dreamworks movies","Studio Ghibli"],["Beef","Chicken","Fish","Pork","Tofu"],
["Iced coffee","Hot coffee","Cold brew","Latte","Mocha"],["Baseball","Basketball","Football","Soccer","Hockey"],["Macaroni and cheese","Grilled cheese","Soup","Salad","Quesadilla"],
["Concerts","Festivals","Club shows","Theater shows","Comedy shows"],["Smoothies","Protein shakes","Juice","Milkshakes","Vitamin water"],["Chevy","Ford","Toyota","Honda","Tesla"],
["Apple pie","Cherry pie","Pumpkin pie","Pecan pie","Lemon meringue"],["Tiramisu","Cheesecake","Crème brûlée","Chocolate cake","Carrot cake"],["Chick-fil-A","In-N-Out","Five Guys","Shake Shack","Burger King"],
["TikTok","YouTube Shorts","Instagram Reels","Snapchat","Triller"],["Taco Bell","Chipotle","Qdoba","Moe's","Del Taco"],["iPhone","Samsung","Google Pixel","Motorola","Nothing Phone"],
["PS5","Xbox Series X","Nintendo Switch","PC Gaming","Steam Deck"],["Harry Potter","Lord of the Rings","Star Wars","Percy Jackson","A Song of Ice and Fire"],["Hand sanitizer","Masks","Gloves","Disinfectant wipes","Vitamin C"],
["Instacart","DoorDash","UberEats","Grubhub","Postmates"],["Marvel","DC","Image Comics","Dark Horse","Boom Studios"],["iHeartRadio","Spotify","Apple Music","Pandora","Tidal"],
["Low-rise jeans","Mom jeans","Skinny jeans","Wide-leg jeans","Cargo pants"],["Birkenstocks","Crocs","Vans","Converse","Doc Martens"],["Friends","How I Met Your Mother","Big Bang Theory","Seinfeld","The Office"],
["Taylor Swift","Beyonce","Rihanna","Drake","Kendrick Lamar"],["PS5","Xbox Series X","Nintendo Switch OLED","PC Gaming","VR Gaming"],["Sprite","7UP","Mountain Dew","Fanta","Dr. Pepper"],
["Makeup brushes","Makeup sponges","Makeup palettes","Lip products","Eye products"],["Memes","POV videos","Life hacks","Food videos","Fashion videos"],["Candy Crush","Among Us","Roblox","Words With Friends","Mario Kart"],
["Latte","Cappuccino","Americano","Mocha","Flat white"],["Gold","Platinum","Rose gold","Silver","Bronze"],["Thank you card","Holiday card","Birthday card","Anniversary card","Just because card"],
["Wine","Beer","Cocktails","Champagne","Hard seltzer"],["iPhone","Samsung","Google Pixel","Motorola","Honor"],["Dr. Seuss","Roald Dahl","J.K. Rowling","Stephen King","Dr. Seuss"],
["Rick Riordan","J.K. Rowling","Stephenie Meyer","Suzanne Collins","Veronica Roth"],["Cheesecake","Tiramisu","Crème brûlée","Flan","Tres Leches"],["Rose","Tulip","Sunflower","Lavender","Lily"],
["Notebook","Laptop","Tablet","Smartphone","Whiteboard"],["TikTok dances","Lip sync videos","POV videos","Life hack videos","Cooking videos"],["Dogs","Cats","Hamsters","Guinea pigs","Ferrets"],
["Chick-fil-A","Popeyes","Wendy's","McDonald's","Burger King"],["PS5 games","Xbox games","Nintendo games","PC games","Mobile games"],["Harry Potter","Percy Jackson","Chronicles of Narnia","Artemis Fowl","His Dark Materials"],
["Harry Potter","Star Wars","Marvel","DC","Lord of the Rings"],["iPad","Surface Pro","Chromebook","Kindle","Laptop"],["Sneakers","Flats","Sandals","Boots","Loafers"],
["Taylor Swift","Olivia Rodrigo","Billie Eilish","Ariana Grande","Dua Lipa"],["Nike","Adidas","New Balance","Puma","Reebok"],["PS5","Xbox Series X","Nintendo Switch","PC","Steam Deck"],
["Red","Pink","Orange","Yellow","Green"],["iPhone","Samsung","Google Pixel","Xiaomi","Motorola"],["iPhone","Samsung","Google Pixel","Nothing","Sony"],
["PS5","Xbox","Nintendo Switch","Steam Deck","PC"],["TikTok","Instagram","Snapchat","Twitter","YouTube"],["Texas Roadhouse","LongHorn","Ruby Tuesday","Applebee's","Chili's"],
["PS5","Xbox Series X","Nintendo Switch","PC","VR Headset"],["Strawberry","Vanilla","Chocolate","Mint","Pistachio"],["Krispy Kreme","Dunkin'","Starbucks","Tim Hortons","Coffee Bean"],
["Snickers","Twix","KitKat","Reese's","M&M's"],["Nike","Adidas","New Balance","Puma","ASICS"],["iPhone SE","iPhone 15","iPhone 15 Pro","Samsung S24","Google Pixel 8"],
["Beach day","Movie night","Hiking","Spa day","Board games"],["Tacos","Sushi","Pizza","Ramen","Burgers"],["Spotify","YouTube","Instagram","TikTok","Netflix"],
["Morning","Afternoon","Evening","Night","Midnight"],["Summer","Winter","Spring","Autumn","Rainy season"],["Mornings","Evenings","Weekends","Holidays","Fridays"],
["Pizza","Tacos","Sushi","Burger","Pasta"]
 ],
 flashPoll:[
{"question":"Pineapple on pizza?","options":["Hell yes","Absolutely not","Only sometimes","I'm vegan"]},{"question":"iPhone or Android?","options":["iPhone","Android","Both","Flip phone"]},{"question":"Best streaming service?","options":["Netflix","Disney+","HBO Max","Prime"]},
{"question":"Morning or night person?","options":["Early bird","Night owl","Depends","I don't sleep"]},{"question":"Coffee or tea?","options":["Coffee","Tea","Both","Energy drinks"]},{"question":"Cats or dogs?","options":["Cats","Dogs","Both","Neither"]},
{"question":"Best Marvel hero?","options":["Iron Man","Spider-Man","Thor","Deadpool"]},{"question":"Favorite social media?","options":["TikTok","Instagram","Twitter/X","YouTube"]},{"question":"Best fast food?","options":["McDonald's","Chick-fil-A","Taco Bell","In-N-Out"]},
{"question":"Would you rather be rich or famous?","options":["Rich","Famous","Both","Neither"]},{"question":"Favorite season?","options":["Spring","Summer","Fall","Winter"]},{"question":"Best game console?","options":["PlayStation","Xbox","Nintendo","PC Master Race"]},
{"question":"Marvel or DC?","options":["Marvel","DC","Both","Neither"]},{"question":"Beach or mountains?","options":["Beach","Mountains","Both","City life"]},{"question":"Favorite pizza topping?","options":["Pepperoni","Mushrooms","Cheese only","Everything"]},
{"question":"Tea with milk?","options":["Yes always","Never","Depends on tea","I don't drink tea"]},{"question":"Best pizza topping?","options":["Pepperoni","Mushrooms","Pineapple","Extra cheese"]},{"question":"Ideal first date?","options":["Coffee","Dinner","Movie","Walk in the park"]},
{"question":"Best way to spend a rainy day?","options":["Movie marathon","Sleep","Cook","Gaming"]},{"question":"Best season?","options":["Spring","Summer","Autumn","Winter"]},{"question":"Best fast food chain?","options":["McDonald's","Chick-fil-A","Taco Bell","In-N-Out"]},
{"question":"Sweet or savoury breakfast?","options":["Sweet","Savoury","Both","Skip breakfast"]},{"question":"Best superhero?","options":["Batman","Spider-Man","Iron Man","Wonder Woman"]},{"question":"Text or call?","options":["Text","Call","Voice note","Ignore"]},
{"question":"Best ice cream flavour?","options":["Vanilla","Chocolate","Strawberry","Mint choc chip"]},{"question":"Your dream pet?","options":["Dog","Cat","Reptile","None"]},{"question":"Best music genre?","options":["Pop","Hip hop","Rock","Country"]},
{"question":"Best time for a road trip?","options":["Sunrise","Midday","Sunset","Middle of the night"]},{"question":"Your coffee order?","options":["Black","Latte","Frappé","I drink tea"]},{"question":"Best pizza crust?","options":["Thin","Thick","Stuffed","Cauliflower"]},
{"question":"Most overrated holiday?","options":["Valentine's","Halloween","New Year's","None of them"]},{"question":"Best way to say I love you?","options":["Words","Gifts","Actions","Quality time"]},{"question":"Worst chore?","options":["Dishes","Laundry","Vacuuming","Bathroom"]},
{"question":"Best movie night snack?","options":["Popcorn","Nachos","Candy","Ice cream"]},{"question":"How do you handle a disagreement?","options":["Talk it out","Cool off first","Write it down","Joke it off"]},{"question":"Best vacation type?","options":["All-inclusive","Backpacking","Road trip","City break"]},
{"question":"Best phone brand?","options":["iPhone","Samsung","Pixel","Something else"]},{"question":"Best social app?","options":["Instagram","TikTok","Snapchat","WhatsApp"]},{"question":"What actually wakes you up?","options":["Alarm","Sunlight","Coffee smell","Nothing works"]},
{"question":"Ideal weekend?","options":["Out with friends","Home alone","Road trip","Family time"]},{"question":"Best comfort food?","options":["Mac and cheese","Ramen","Pizza","Soup"]},{"question":"Best superpower?","options":["Teleportation","Invisibility","Time travel","Mind reading"]},
{"question":"Worst haircut era?","options":["Mullet","Bowl cut","Frosted tips","Buzz cut"]},{"question":"Best breakfast drink?","options":["Coffee","Orange juice","Tea","Smoothie"]},{"question":"Cinema or sofa?","options":["Cinema","Sofa","Drive-in","Doesn't matter"]},
{"question":"Best way to relax?","options":["Hot bath","Long walk","Music","Doom scrolling"]},{"question":"Cook or order in?","options":["Cook","Order in","Takeout","Cereal counts"]},{"question":"Best fictional couple?","options":["Ross and Rachel","Jim and Pam","Romeo and Juliet","Shrek and Fiona"]},
{"question":"Most annoying sound?","options":["Chewing","Nail tapping","Alarm","Sirens"]},{"question":"Best board game?","options":["Monopoly","Scrabble","Uno","Chess"]},{"question":"Best weather?","options":["Sunny and warm","Rainy","Snowy","Thunderstorms"]},
{"question":"How do you sleep?","options":["On my back","On my side","Face down","Starfish"]},{"question":"Best cinema snack?","options":["Popcorn","Nachos","Chocolate","Nothing"]},{"question":"Your alarm style?","options":["One alarm","Ten alarms","Snooze king","No alarm"]},
{"question":"Best way to exercise?","options":["Gym","Running","Dancing","Walking"]},{"question":"Best type of cake?","options":["Chocolate","Vanilla","Red velvet","Cheesecake"]},{"question":"Best decade for music?","options":["80s","90s","2000s","2010s"]},
{"question":"How do you take your eggs?","options":["Scrambled","Fried","Boiled","No eggs"]},{"question":"Best video game genre?","options":["Shooter","RPG","Puzzle","Sports"]},{"question":"Ideal nap length?","options":["20 minutes","One hour","Three hours","No naps"]},
{"question":"Best pizza night movie?","options":["Comedy","Horror","Rom-com","Action"]},{"question":"Best way to travel?","options":["Plane","Train","Car","Boat"]},{"question":"Do you talk in your sleep?","options":["Always","Sometimes","Never","No idea"]},
{"question":"Best laundry day?","options":["Monday","Wednesday","Weekend","When clothes run out"]},{"question":"Best app you use daily?","options":["Spotify","YouTube","WhatsApp","Instagram"]},{"question":"Best way to apologise?","options":["Words","A gift","Actions","Time"]},
{"question":"How many alarms do you set?","options":["One","Two or three","Five plus","None"]},{"question":"Favourite type of restaurant?","options":["Italian","Mexican","Chinese","Indian"]},{"question":"Best way to spend $100?","options":["Clothes","Food","Gadgets","Save it"]},
{"question":"Biggest fear?","options":["Spiders","Heights","Public speaking","Being alone"]},{"question":"Best party snack?","options":["Chips","Wings","Pizza","Nachos"]},{"question":"Do you fold your laundry?","options":["Always","Sometimes","Never","What's folding"]},
{"question":"Best time to eat dinner?","options":["5pm","7pm","9pm","Whenever"]},{"question":"Best Disney movie?","options":["Lion King","Frozen","Aladdin","Mulan"]},{"question":"How do you like your coffee?","options":["Hot","Iced","Frappé","No coffee"]},
{"question":"Best way to celebrate?","options":["Dinner out","Party","Quiet night","A trip"]},{"question":"Which is worse?","options":["Being late","Being stood up","Ghosting","Overthinking"]},{"question":"Best late night snack?","options":["Cereal","Instant noodles","Toast","Leftovers"]},
{"question":"Best workout time?","options":["Morning","Lunch","Evening","Never"]},{"question":"Most important phone feature?","options":["Camera","Battery","Speed","Price"]},{"question":"How long is your shower?","options":["Five minutes","Ten minutes","Twenty minutes","Forever"]},
{"question":"Best ice cream format?","options":["Cone","Cup","Sundae","Milkshake"]},{"question":"Your go-to karaoke song?","options":["Ballad","Pop anthem","Rock classic","Anything 90s"]},{"question":"Do you trust weather apps?","options":["Always","Sometimes","Never","I look outside"]},
{"question":"Best movie snack combo?","options":["Popcorn and soda","Nachos and cheese","Candy and water","Nothing"]},{"question":"Best pizza size?","options":["Personal","Medium","Large","Extra large"]},{"question":"Best haircut style?","options":["Short","Medium","Long","Whatever happens"]},
{"question":"Best date night?","options":["Fancy dinner","Movie at home","Games night","Surprise plan"]},{"question":"What's your bed time?","options":["Before 10","Between 10 and 12","After midnight","No schedule"]},{"question":"Which is more romantic?","options":["Sunset walk","Surprise gift","Handwritten letter","Cooking together"]},
{"question":"Best way to wake your partner?","options":["Breakfast","A kiss","Music","Leave them alone"]},{"question":"Best pet name style?","options":["Human name","Food name","Pun name","Classic like Max"]},{"question":"Best dessert to share?","options":["Sundae","Cake","Cookies","Anything chocolate"]},
{"question":"Best shower soundtrack?","options":["Pop","Rock","Podcast","Silence"]},{"question":"Favourite holiday food?","options":["Turkey","Ham","Tamales","Cookies"]},{"question":"How do you handle traffic?","options":["Podcast","Music loud","Silence","Rage"]},
{"question":"Best thing about weekends?","options":["Sleeping in","Going out","No work","Seeing friends"]},{"question":"Most useful invention ever?","options":["Internet","Electricity","Washing machine","Pizza delivery"]},{"question":"Best way to end the night?","options":["Long chat","Movie","Snack","Sleep immediately"]},
{"question":"What's your biggest ick?","options":["Loud chewing","Bad manners","Being late","Vague texting"]}
 ],
 wordStorm:[
{"category":"Fruits"},{"category":"Vegetables"},{"category":"Pizza Toppings"},
{"category":"Social Media Apps"},{"category":"Video Games"},{"category":"Pokemon"},
{"category":"Harry Potter Characters"},{"category":"Candy"},{"category":"Ice Cream Flavors"},
{"category":"Cereals"},{"category":"Olympic Sports"},{"category":"Board Games"},
{"category":"TikTok Trends"},{"category":"YouTubers"},{"category":"Rappers"},
{"category":"Rock Bands"},{"category":"K-Pop Groups"},{"category":"Cartoon Characters"},
{"category":"Netflix Shows"},{"category":"Anime Shows"},{"category":"Horror Movies"},
{"category":"Comedy Movies"},{"category":"Christmas Movies"},{"category":"Birthday Themes"},
{"category":"Wedding Traditions"},{"category":"Cat Breeds"},{"category":"Zoo Animals"},
{"category":"Bugs/Insects"},{"category":"Mythical Creatures"},{"category":"Birds"},
{"category":"Flowers"},{"category":"Trees"},{"category":"Natural Disasters"},
{"category":"Space/Planets"},{"category":"Clothing Items"},{"category":"Jewelry Types"},
{"category":"Colors"},{"category":"Body Parts"},{"category":"Music Genres"},
{"category":"Classical Music"},{"category":"Opera Terms"},{"category":"Gym Equipment"},
{"category":"Workout Types"},{"category":"Vegan Foods"},{"category":"Carb Sources"},
{"category":"Healthy Snacks"},{"category":"French Foods"},{"category":"Chinese Foods"},
{"category":"Thai Foods"},{"category":"Grill Foods"},{"category":"Beverages"},
{"category":"Alcoholic Drinks"},{"category":"Coffee Drinks"},{"category":"Tea Types"},
{"category":"Juice Flavors"},{"category":"US Cities"},{"category":"European Countries"},
{"category":"Asian Countries"},{"category":"African Countries"},{"category":"Capitals"},
{"category":"Ski Resorts"},{"category":"Tourist Attractions"},{"category":"Mountains"},
{"category":"Famous Hotels"},{"category":"Cruise Lines"},{"category":"Disney Characters"},
{"category":"Pixar Movies"},{"category":"Looney Tunes"},{"category":"Simpsons Characters"},
{"category":"Avatar Characters"},{"category":"Star Wars Characters"},{"category":"LOTR Characters"},
{"category":"Breaking Bad Characters"},{"category":"Office Characters"},{"category":"Movies with Numbers in Title"},
{"category":"Scary Movie Monsters"},{"category":"Famous Actresses"},{"category":"World Leaders"},
{"category":"Inventors"},{"category":"Poets"},{"category":"Book Series"},
{"category":"Classic Novels"},{"category":"Nintendo Games"},{"category":"PlayStation Exclusives"},
{"category":"Xbox Games"},{"category":"Mobile Games"},{"category":"MMORPGs"},
{"category":"Racing Games"},{"category":"Zelda Items"},{"category":"Fortnite Skins"},
{"category":"Call of Duty Games"},{"category":"FIFA Teams"},{"category":"Olympic Medals"},
{"category":"MLB Teams"},{"category":"NHL Teams"},{"category":"Soccer Teams"},
{"category":"Formula 1 Teams"},{"category":"UFC Fighters"},{"category":"Pro Surfers"},
{"category":"Sports Equipment"}
 ],
 spyInTheCrowd:[
{"category":"Fruit","commonWord":"Apple","spyWord":"Pear"},{"category":"Fruit","commonWord":"Banana","spyWord":"Plantain"},{"category":"Fruit","commonWord":"Watermelon","spyWord":"Cantaloupe"},
{"category":"Vegetable","commonWord":"Broccoli","spyWord":"Cauliflower"},{"category":"Vegetable","commonWord":"Potato","spyWord":"Sweet Potato"},{"category":"Vegetable","commonWord":"Tomato","spyWord":"Red Pepper"},
{"category":"Vegetable","commonWord":"Lettuce","spyWord":"Cabbage"},{"category":"Vegetable","commonWord":"Onion","spyWord":"Shallot"},{"category":"Vegetable","commonWord":"Spinach","spyWord":"Kale"},
{"category":"Animal","commonWord":"Dog","spyWord":"Wolf"},{"category":"Animal","commonWord":"Horse","spyWord":"Donkey"},{"category":"Animal","commonWord":"Cow","spyWord":"Bull"},
{"category":"Animal","commonWord":"Pig","spyWord":"Boar"},{"category":"Animal","commonWord":"Chicken","spyWord":"Turkey"},{"category":"Animal","commonWord":"Rabbit","spyWord":"Hare"},
{"category":"Animal","commonWord":"Elephant","spyWord":"Rhino"},{"category":"Animal","commonWord":"Bear","spyWord":"Panda"},{"category":"Animal","commonWord":"Dolphin","spyWord":"Whale"},
{"category":"Animal","commonWord":"Snake","spyWord":"Lizard"},{"category":"Animal","commonWord":"Eagle","spyWord":"Hawk"},{"category":"Animal","commonWord":"Owl","spyWord":"Falcon"},
{"category":"Food","commonWord":"Pasta","spyWord":"Noodles"},{"category":"Food","commonWord":"Sushi","spyWord":"Sashimi"},{"category":"Food","commonWord":"Taco","spyWord":"Burrito"},
{"category":"Food","commonWord":"Chicken Wings","spyWord":"Chicken Nuggets"},{"category":"Food","commonWord":"French Fries","spyWord":"Potato Wedges"},{"category":"Dessert","commonWord":"Cake","spyWord":"Cupcake"},
{"category":"Dessert","commonWord":"Donut","spyWord":"Bagel"},{"category":"Dessert","commonWord":"Pie","spyWord":"Tart"},{"category":"Dessert","commonWord":"Cheesecake","spyWord":"Tiramisu"},
{"category":"Drink","commonWord":"Tea","spyWord":"Chai"},{"category":"Drink","commonWord":"Soda","spyWord":"Juice"},{"category":"Drink","commonWord":"Beer","spyWord":"Cider"},
{"category":"Drink","commonWord":"Wine","spyWord":"Champagne"},{"category":"Drink","commonWord":"Whiskey","spyWord":"Bourbon"},{"category":"Drink","commonWord":"Water","spyWord":"Sparkling Water"},
{"category":"Sport","commonWord":"Football","spyWord":"Rugby"},{"category":"Sport","commonWord":"Baseball","spyWord":"Softball"},{"category":"Sport","commonWord":"Swimming","spyWord":"Diving"},
{"category":"Movie Genre","commonWord":"Horror","spyWord":"Thriller"},{"category":"Movie Genre","commonWord":"Action","spyWord":"Adventure"},{"category":"Celebrity","commonWord":"The Rock","spyWord":"Vin Diesel"},
{"category":"Celebrity","commonWord":"Zendaya","spyWord":"Yara Shahidi"},{"category":"Celebrity","commonWord":"Kim Kardashian","spyWord":"Kylie Jenner"},{"category":"Country","commonWord":"France","spyWord":"Italy"},
{"category":"Country","commonWord":"Japan","spyWord":"South Korea"},{"category":"Country","commonWord":"Brazil","spyWord":"Argentina"},{"category":"Country","commonWord":"Germany","spyWord":"Austria"},
{"category":"Country","commonWord":"UK","spyWord":"Ireland"},{"category":"City","commonWord":"Paris","spyWord":"Rome"},{"category":"City","commonWord":"Dubai","spyWord":"Abu Dhabi"},
{"category":"City","commonWord":"Vegas","spyWord":"Reno"},{"category":"Tech","commonWord":"Mac","spyWord":"PC"},{"category":"Tech","commonWord":"Netflix","spyWord":"Hulu"},
{"category":"Tech","commonWord":"YouTube","spyWord":"Twitch"},{"category":"Tech","commonWord":"Instagram","spyWord":"Snapchat"},{"category":"Tech","commonWord":"TikTok","spyWord":"Reels"},
{"category":"Tech","commonWord":"Google","spyWord":"Bing"},{"category":"Tech","commonWord":"Spotify","spyWord":"Apple Music"},{"category":"Tech","commonWord":"DoorDash","spyWord":"UberEats"},
{"category":"Place","commonWord":"City","spyWord":"Town"},{"category":"Place","commonWord":"School","spyWord":"College"},{"category":"Place","commonWord":"Hospital","spyWord":"Clinic"},
{"category":"Place","commonWord":"Mall","spyWord":"Supermarket"},{"category":"Place","commonWord":"Hotel","spyWord":"Motel"},{"category":"Superhero","commonWord":"Spider-Man","spyWord":"Miles Morales"},
{"category":"Superhero","commonWord":"Thor","spyWord":"Loki"},{"category":"Superhero","commonWord":"Wonder Woman","spyWord":"Supergirl"},{"category":"Superhero","commonWord":"Deadpool","spyWord":"Wolverine"},
{"category":"Disney","commonWord":"Elsa","spyWord":"Anna"},{"category":"Disney","commonWord":"Simba","spyWord":"Mufasa"},{"category":"Disney","commonWord":"Woody","spyWord":"Buzz Lightyear"},
{"category":"Disney","commonWord":"Nemo","spyWord":"Dory"},{"category":"Weather","commonWord":"Rain","spyWord":"Drizzle"},{"category":"Weather","commonWord":"Thunder","spyWord":"Lightning"},
{"category":"Weather","commonWord":"Sunny","spyWord":"Clear"},{"category":"Weather","commonWord":"Hot","spyWord":"Warm"},{"category":"Weather","commonWord":"Cold","spyWord":"Freezing"},
{"category":"Vehicle","commonWord":"Car","spyWord":"SUV"},{"category":"Vehicle","commonWord":"Truck","spyWord":"Pickup"},{"category":"Vehicle","commonWord":"Plane","spyWord":"Helicopter"},
{"category":"Clothing","commonWord":"T-Shirt","spyWord":"Tank Top"},{"category":"Clothing","commonWord":"Jeans","spyWord":"Khakis"},{"category":"Clothing","commonWord":"Dress","spyWord":"Gown"},
{"category":"Clothing","commonWord":"Suit","spyWord":"Tuxedo"},{"category":"Clothing","commonWord":"Boots","spyWord":"Clogs"},{"category":"Clothing","commonWord":"Hat","spyWord":"Cap"},
{"category":"Clothing","commonWord":"Scarf","spyWord":"Shawl"},{"category":"Game","commonWord":"Minecraft","spyWord":"Roblox"},{"category":"Game","commonWord":"Fortnite","spyWord":"PUBG"},
{"category":"Game","commonWord":"Pokemon","spyWord":"Digimon"},{"category":"Game","commonWord":"Sonic","spyWord":"Shadow"},{"category":"Game","commonWord":"FIFA","spyWord":"PES"},
{"category":"Game","commonWord":"Call of Duty","spyWord":"Battlefield"},{"category":"Instrument","commonWord":"Guitar","spyWord":"Bass"},{"category":"Instrument","commonWord":"Piano","spyWord":"Keyboard"},
{"category":"Color","commonWord":"Red","spyWord":"Pink"},{"category":"Color","commonWord":"Green","spyWord":"Mint"},{"category":"Color","commonWord":"Purple","spyWord":"Violet"},
{"category":"Holiday","commonWord":"New Year","spyWord":"Chinese New Year"}
 ],
 secretGuess:[
"Pizza","Taco","Sushi",
"Burger","Pasta","Ramen",
"Salad","Soup","Steak",
"Apple","Banana","Orange",
"Grape","Strawberry","Watermelon",
"Pineapple","Cat","Horse",
"Cow","Lion","Tiger",
"Bear","Car","Truck",
"Bike","Bus","Train",
"Plane","Boat","Sun",
"Star","Snow","Fire",
"Water","House","Cabin",
"Castle","Book","Laptop",
"Shoe","Watch","Hat",
"Backpack","Key","Coin",
"Ring","Bracelet","Painting",
"Photo","Guitar","Speaker",
"TV","Clock","Mirror",
"Candle","Flower","Tree",
"Ocean","River","Mountain",
"Desert","Island","Beach",
"City","Town","Sandwich",
"Hotdog","Fries","Nuggets",
"Wings","Ice Cream","Donut",
"Cake","Pie","Cookie",
"Brownie","Pancake","Waffle",
"Cereal","Yogurt","Cheese",
"Bread","Rice","Dim Sum",
"Pho","Tortilla","Enchilada",
"Tamale","Coffee","Tea",
"Juice","Soda","Milk",
"Smoothie","Shake","Lemonade",
"Latte","Espresso","Mocha",
"Cappuccino"
 ],
 dares:[
{"text":"Send your partner a voice note singing the chorus of your favourite song."},{"text":"Describe your partner in exactly three emojis - no words."},{"text":"Do your best impression of your partner answering the phone."},
{"text":"Take a silly selfie right now and send it."},{"text":"Say a tongue twister three times fast, out loud."},{"text":"Name five things you love about your partner in ten seconds."},
{"text":"Speak in an accent of your partner's choice for the next round."},{"text":"Type your partner's name using only your nose."},{"text":"Do ten jumping jacks on camera."},
{"text":"Give your partner a compliment using exactly seven words."},{"text":"Sing the alphabet like an opera singer."},{"text":"Show the most random object within arm's reach and explain it."},
{"text":"Tell a two-sentence story about your first date."},{"text":"Do your best catwalk across the room."},{"text":"Text your partner the last photo in your camera roll."},
{"text":"Say 'I love you' in three different languages."},{"text":"Make up a 10-second rap about your partner's laugh."},{"text":"Hold a plank while your partner counts to ten."},
{"text":"Reveal the last thing you searched on your phone."},{"text":"Send a virtual hug - describe it in one dramatic sentence."},{"text":"Say \"I love you\" in your worst accent."},
{"text":"Send your partner the third photo in your gallery."},{"text":"Do 15 seconds of your best dance move."},{"text":"Compliment your partner in exactly four words."},
{"text":"Describe your partner using only sounds."},{"text":"Make up a 10-second jingle about your partner."},{"text":"Speak only in questions until your next turn."},
{"text":"Tell your partner one thing you've never told them."},{"text":"Do your best robot impression."},{"text":"Send a voice note of your best laugh."},
{"text":"Name three things you'd take to a desert island, in five seconds."},{"text":"Balance a spoon on your nose for ten seconds."},{"text":"Tell a joke that makes your partner groan."},
{"text":"Give a 30-second talk about your favourite snack."},{"text":"Text your partner an all-caps message about nothing."},{"text":"Do a dramatic reading of the nearest food label."},
{"text":"Say the alphabet backwards, slowly."},{"text":"Show your most-used emoji and explain why."},{"text":"Sing your partner's name to a nursery rhyme tune."},
{"text":"Do five push-ups or five squats, their choice."},{"text":"Reveal the last text you sent someone else."},{"text":"Do an impression of a famous person until they guess."},
{"text":"Send your partner your lock-screen wallpaper."},{"text":"Name five things starting with a letter your partner picks."},{"text":"Talk in third person for the next two rounds."},
{"text":"Hold a plank for ten seconds."},{"text":"Write your partner's name in the air with your nose."},{"text":"Tell the story of your first kiss in three sentences."},
{"text":"Make a heart with your hands and hold it up."},{"text":"Describe your perfect Sunday in 15 words."},{"text":"Give your partner a 20-second shoulder rub."},
{"text":"Say something you appreciate about your partner's laugh."},{"text":"Do a catwalk then strike a pose."},{"text":"Read your last internet search out loud."},
{"text":"Tell your partner one thing you want to do together this year."},{"text":"Do an interpretive dance of \"Monday morning\"."},{"text":"Send the emoji that describes your day, no words."},
{"text":"Name three of your partner's habits you secretly love."},{"text":"Whisper until your next turn."},{"text":"Do ten seconds of air guitar."},
{"text":"Tell your partner your favourite memory of them."},{"text":"Compliment three things in the room in ten seconds."},{"text":"Say \"you're my favourite person\" without those words."},
{"text":"Make the silliest face you can and hold it for ten seconds."},{"text":"Recite a four-line poem about snacks."},{"text":"Do your impression of the last movie you watched."},
{"text":"Send a selfie with the worst filter you have."},{"text":"Name one thing you'd change about your mornings."},{"text":"Tell your partner what you'd cook for them on a rainy day."},
{"text":"Narrate what you're looking at for 15 seconds."},{"text":"Send a voice memo of your favourite song's first line."},{"text":"Give your partner a two-word nickname and explain it."},
{"text":"Show a secret talent and prove it in 20 seconds."},{"text":"Say ten nice words about your partner in ten seconds."},{"text":"Use the worst robot voice you can for one round."},
{"text":"Show the oldest photo in your camera roll."},{"text":"Describe your day using only weather."},{"text":"Tell your partner when you first thought \"they're the one\"."},
{"text":"Do ten jumping jacks counting in another language."},{"text":"Recommend a movie in one sentence."},{"text":"Invent a handshake with your partner."},
{"text":"List five things in your room starting with the letter B."},{"text":"Commentate your next minute like a sports broadcaster."},{"text":"Say something sweet without laughing."},
{"text":"Read out your last notification."},{"text":"Name three things you'd grab in a fire."},{"text":"Tell your partner a compliment you've never said out loud."},
{"text":"Do a cartoon character voice for one sentence."},{"text":"Explain your most-used app like a science project."},{"text":"Give your partner a dramatic soap-opera goodbye."},
{"text":"Recite your favourite quote in a robot voice."},{"text":"Send an emoji-only message describing your mood."},{"text":"Do one word per question for two rounds."},
{"text":"Tell your partner what you'd do with one extra hour a day."},{"text":"Describe your favourite meal in exactly three words."},{"text":"Do a ten-second impression of your partner's morning face."},
{"text":"Name one thing you pretend to like but don't."},{"text":"Say the alphabet in a strange accent."},{"text":"Tell your partner something you want to learn together."},
{"text":"Describe your partner's laugh to a stranger in one sentence."}
 ]
};

/* ═══════════════════════════════════════════════════════════════════
   Picker — shuffle-bag randomiser.

   Every game cycles through a shuffled deck of its 100 questions before
   repeating any. The deck is stored in localStorage, so closing the app
   and coming back does not restart at question 1, and two players on
   different devices never see the same order.

   The host is the only client that calls this; the result is written to
   the database so both players always get the same question.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  const STORE = 'duovibe_bags_v1';
  const BAG_CATS = [
    'wouldRather', 'redGreenFlag', 'compatQuiz', 'hotTakes', 'bucketList',
    'truthOrDare', 'mindMeld', 'vibeSlider', 'percentage', 'blindRank',
    'flashPoll', 'wordStorm', 'spyInTheCrowd', 'secretGuess', 'dares'
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function save(bags) {
    try { localStorage.setItem(STORE, JSON.stringify(bags)); } catch (e) {}
  }

  function shuffle(n) {
    const a = [];
    for (let i = 0; i < n; i++) a.push(i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  window.Picker = {
    _bags: load(),

    /* Next unused index for a bank. Returns -1 only if the bank is empty. */
    nextIndex(cat) {
      const list = window.GAME_BANKS[cat] || window.GAME_BANKS.wouldRather;
      if (!list || !list.length) return -1;

      let bag = this._bags[cat];
      if (!Array.isArray(bag) || bag.length === 0) {
        bag = shuffle(list.length);
        this._bags[cat] = bag;
      }

      let idx = bag.pop();

      /* Never serve the previous question twice in a row, even across decks */
      const last = this._bags['_last_' + cat];
      if (list.length > 1 && idx === last) {
        const alt = bag.pop();
        if (alt !== undefined) { bag.unshift(idx); idx = alt; }
      }
      this._bags['_last_' + cat] = idx;

      save(this._bags);
      return idx;
    },

    nextItem(cat) {
      const list = window.GAME_BANKS[cat] || window.GAME_BANKS.wouldRather;
      const idx = this.nextIndex(cat);
      if (idx < 0) return { question: 'Default question' };
      const item = list[idx];

      if (cat === 'secretGuess') {
        return {
          items: list,
          target: item,
          question: 'Guess the secret word! Both pick the same to win!',
          title: 'Mastermind'
        };
      }
      if (cat === 'mindMeld') {
        return {
          word: item.word,
          question: 'Think of a word connected to: ' + item.word,
          topic: item.word,
          title: 'Mind Meld'
        };
      }
      if (cat === 'hotTakes') {
        return {
          statement: item.statement,
          question: item.statement,
          topic: item.statement,
          agreePercent: item.agreePercent,
          title: 'Hot Takes Radar'
        };
      }
      if (cat === 'bucketList') {
        return {
          idea: item.idea,
          question: item.idea,
          topic: item.category,
          optionA: item.idea,
          optionB: 'Skip this idea',
          title: 'LDR Bucket List'
        };
      }
      if (cat === 'truthOrDare') {
        return {
          type: item.type,
          content: item.content,
          question: item.content,
          mode: String(item.type || 'truth').toUpperCase(),
          title: 'Truth or Dare'
        };
      }
      if (cat === 'vibeSlider') {
        return {
          scenario: item.scenario,
          question: item.scenario,
          topic: item.context,
          title: 'Vibe Slider'
        };
      }
      if (cat === 'blindRank') {
        return {
          items: Array.isArray(item) ? item.slice() : [],
          question: 'Rank these items from favourite to least favourite',
          title: 'Blind Rank'
        };
      }
      /* flashPoll, wordStorm, spyInTheCrowd, wouldRather, redGreenFlag,
         compatQuiz, percentage, dares all use their own shape */
      return item;
    },

    get50Items() {
      return window.GAME_BANKS.secretGuess;
    },

    /* Exposed for tests / debugging */
    remaining(cat) {
      const bag = this._bags[cat];
      return Array.isArray(bag) ? bag.length : window.GAME_BANKS[cat].length;
    },
    reset() {
      this._bags = {};
      save(this._bags);
    }
  };
})();
