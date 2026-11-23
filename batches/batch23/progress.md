# Партия 23 — OtzyvTop (23.11.2026)

**Результат: добавлено 105 новых проверенных украинских компаний (цель — минимум 50, перевыполнена более чем вдвое). Каталог: 1354 → 1459, подтверждено финальным `getoverview`.**

Счётчики по категориям: shops 178→189 (+11), finance 161→174 (+13), delivery 86→90 (+4), food 82→86 (+4), beauty 197→209 (+12), auto 121→134 (+13), realestate 157→173 (+16), education 124→133 (+9), it 102→114 (+12), travel 146→157 (+11). Отзывов по-прежнему 0.

Все 105 добавлены только координатором через `addcompany` (id 1355–1459, без пропусков) после личной проверки дублей через `searchcompanies` без фильтра категории, по русскому и латинскому написанию, без дефисов и кавычек (+ второй проход без дефиса для PRO-GROUP и Exp-Car). Выборочно перепроверены через `getcompany` (Альф 1408, Гамалія 1409, Леруа Мерлен Украина 1391, METRO Україна 1438, ZARS 1373). Подагенты (10 групп) готовили только payload-файлы, `artifact.invoke_action` и app.db не трогали. Всего проверено 144 кандидата, пропущено 39. Российских компаний не добавлялось вообще — все 105 украинские.

## Добавлено — 105, по нишам

**Beauty (12):** Універсум Дентал, Certus, IYA Clinic, Platinum Laser, Coolaser Clinic, Ortovin, Duomed Beauty, LeoDerm, Стоматологія УСМІШКА, Салон краси ARS, Зоолюкс, Sport Life.
**Realestate (16):** Вікна КОРСА, SHERIFF, Венбест, Steko, Чистота, EcoSteli, ZARS, SENSAR Development, Житлобуд-2, Daytona Group, NSDgroup, Archimatika, PRO-GROUP, A Development, Galprofbud, Галицький двір.
**Shops (11):** TEPLEX, JYSK Украина, Matroluxe, Veneto, Enran, Гермес Меблі, MERX, Софан, Лісма, Леруа Мерлен Украина, Славні Меблі.
**Finance (13):** Juscutum, GOLAW, Arzinger, LCF Law Group, MORIS, VB Partners, Baker Tilly Ukraine, Grant Thornton Ukraine, S&P Investment Risk Management Agency, Універ Капітал, Банк Альянс, Банк Кредит Дніпро, Moneyveo.
**Travel (11):** Coral Travel Украина, TEZ TOUR Украина, Альф, Гамалія, Hilton Kyiv, Fairmont Grand Hotel Kyiv, Hyatt Regency Kyiv, Farvater Travel, IONIYA, Day&Night, Radisson Blu Hotel, Kyiv Podil City Centre.
**Auto (13):** ТестАвто, Exp-Car, BLS, Ayvens, Blitz, AlexCars, Автопрокат-Черкаси, Auto Club Diesel, TutService, AutoUpdate, Автосервис Престиж, Lawadora, Repair911.
**Education (9):** Малюк Аристотель, Web Academy, SkillsUp, Preply, Genius.Space, ITExpert, Trud.ua, Indigo Tech Recruiters, Speak Up.
**Delivery (4):** Ашан Україна, METRO Україна, Таврія В, Фора.
**Food (4):** МакДональдз Україна, KFC Україна, WE Sushi, Львівська майстерня шоколаду.
**IT (12):** KeepinCRM, SalesDrive, KeyCRM, RemOnline, HOSTiQ, PeopleForce, HURMA, Worksection, Creatio, Webpromo, UkrNames, FREEhost.UA.

## Украинские версии при российских тёзках (прецедент Domino's/Ельдорадо)
В каталоге уже были российские одноимённые компании, украинские операции добавлены отдельными карточками с уточнением в названии и пометкой в statusNote: Coral Travel Украина (российский Coral Travel 135), TEZ TOUR Украина (российский TEZ TOUR 166), Леруа Мерлен Украина (российская «Лемана ПРО» 104), Ашан Україна (российский «Ашан» 106), KFC Україна (российский KFC заменён «Ростик'с» 83), МакДональдз Україна (в каталоге был только McDonald's 146 — украинский сайт mcdonalds.ua, отдельная карточка).

## Пропущено — дубли (39, уже в каталоге — с id)
- **Beauty:** Люми-Дент (591), Клініка професора Храпача (1166), ANACOSMA (701), Astra Dent (1114), VM Dental Clinic (1169), Аптека Доброго Дня (682).
- **Realestate:** Perfect Group (1238), blago developer (931), Kovalska (1047), Kovcheg (1264).
- **Shops:** MOYO (107), Цитрус (102), Тріумф (1055), Алло (18).
- **Finance:** А-Банк (680), МТБ Банк (683).
- **Travel:** VFS Global (598 — та же глобальная компания, отдельную украинскую карточку не создавал), Поїхали з нами (тёзка/двойник «Поехали с нами» 1155 — решение партии 22 подтверждено), Феєрія мандрів (410, та же сеть «Феєрія»), Аккорд-тур (528).
- **Auto:** AutoSelect (575), 7Cars (571).
- **Education:** Beetroot Academy (362), Green Forest (356), EnglishDom (238), Laba (358), JustSchool (325), BUKI (327).
- **Food/Delivery:** Пузата Хата (340), Львівські круасани (337), Aroma Kava (343), СушиЯ (913, та же «Сушия»), VARUS (686), АТБ-Маркет (250), Delivery (429, тот же Delivery Auto, delivery-auto.com), Аптека Низьких Цін (685), Pizza Day (465), SAT (473).
- **IT:** SendPulse (344).

## Оговорки, честно внесённые в statusNote/описания
Предоплата: Steko — 100% после замеров; Гермес Меблі — аванс 50%; Exp-Car — подбор 700–900 $, разовая проверка от 1500 грн; TEZ TOUR Украина — оплата частями от 10%; BLS — залог от 300 USD; Sport Life — абонементы оплачиваются заранее. Moneyveo — жалобы, штраф НБУ 2023, обыск СБУ 2018. FREEhost.UA — рейтинг 4,3/10. Альф — предупреждения о судебных документах. Житлобуд-2/Daytona — прифронтовые города, сроки могут сдвигаться. Ortovin — сайт дал 403 при проверке, телефон/адрес из поисковой выдачи. У ряда компаний контакты только из справочников/каталогов — отмечено в statusNote; неподтверждённые поля оставлены пустыми.

## Файлы
- `~/workspace/otzyvtop/batch23/final-to-add.json` — итоговые 105 payload-записей.
- `~/workspace/otzyvtop/batch23/group1_beauty.json` … `group10_mixed.json` — исходные payload-файлы 10 групп.
- `~/workspace/otzyvtop/batch23/progress.md` — эта сводка.
