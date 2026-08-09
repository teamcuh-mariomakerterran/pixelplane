# Whole City Remembers – Global Consequence System

## Flag Registry

| Whole City Remembers — Global Consequence Flag Registry |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flag ID | Flag Name | Category | Trigger Condition | Flag State | Example NPC Lines Affected | Districts Where Active | Priority | Notes / Design Intent |
| FLAG_001 | Strays Spared | Moral Choice | Player spared stray animals in the Undercroft | Active | "You let the dogs run free — my kid loves them now." / "Someone called the strays off." | Undercroft, Market Row, South Gate | High | Mercy flag for non-hostile creatures; affects child and animal-adjacent NPCs |
| FLAG_002 | Bench Saved | Moral Choice | Player repaired the memorial bench in Old Quarter park | Active | "Someone finally fixed old Ren's bench." / "I saw you there — that meant something." | Old Quarter, Civic Green, North Bridge | Medium | Small emotional resonance flag; signals player attentiveness to world detail |
| FLAG_003 | Rain On | Weather | Active rain event is running (dynamic, toggled hourly) | Active | "Miserable day — at least the gutters will clear." / "Come in out of the wet, stranger." | All Districts | Low | Real-time weather state; ambient lines only; toggled by weather system |
| FLAG_004 | Sister Told | Quest Completion | Player told Maren's sister her fate before the council announcement | Active | "I heard it from her own sister before the criers spoke." / "You told Della yourself — that takes guts." | Dockside, Temple Row, The Warrens | High | Gating flag for Della's questline and council reputation; must fire before Act 2 lock |
| FLAG_005 | Lantern Lit | World State | Player re-lit the memorial lantern at Mourner's Gate | Active | "The lantern's been dark for three years — thank you." / "I looked up expecting darkness and got light." | Mourner's Gate, East Alley, Chapel Row | Medium | Toggles visible world prop; affects mourner NPCs and nighttime ambience |
| FLAG_006 | Healer Funded | Quest Completion | Player donated coin to reopen the free clinic in The Warrens | Active | "My daughter got her cough seen to — first time in years." / "Rich folk funding the poor quarter. Suspicious." | The Warrens, Dockside, Market Row | High | Unlocks merchant and healing services; affects sick NPC recovery states |
| FLAG_007 | Foreman Accused | Moral Choice | Player publicly accused the dockside foreman of bribery | Active | "You called out Aldric in front of the whole crew." / "The foreman's been quieter — watch your back." | Dockside, Harbor Gate, The Warrens | High | Triggers foreman hostility arc; shifts dockworker NPC dispositions |
| FLAG_008 | Midnight Pact | Companion Bond | Player completed the late-night bonding scene with companion Vael | Active | "Vael seems lighter lately." / "I don't know what you said at the clock tower but they've been smiling." | Old Quarter, Clock Tower Plaza, The Spire | Medium | Trust threshold flag; unlocks Vael's personal questline branch |
| FLAG_009 | Curfew Broken | Reputation | Player violated curfew 3+ times in Civic District | Active | "Guard captain's been asking about someone matching your description." / "You really don't care about the bell." | Civic District, North Gate, Market Row | Medium | Increases guard aggression and merchant wariness; resets on fine payment |
| FLAG_010 | Archive Sealed | Quest Completion | Player chose to seal the city archive rather than publish it | Active | "Someone locked up the old records — wonder what's worth hiding." / "Better sealed than weaponised." | Scholar's Quarter, Civic District, The Spire | High | Major story branch; mutually exclusive with FLAG_011 |
| FLAG_011 | Archive Opened | Quest Completion | Player published the city archive's contents to the public | Active | "I read the transcripts — half the council should be in chains." / "Some things were better left unread." | Scholar's Quarter, All Districts | High | Mutually exclusive with FLAG_010; triggers city-wide reputation cascade |
| FLAG_012 | Flood Warned | World State | Player warned Dockside residents about the coming flood | Active | "We got out because of you — the whole lower quarter." / "Someone cried flood the night before. Sounds mad. Also true." | Dockside, Harbor Gate, The Warrens | High | Affects flood aftermath NPC survival states; gates a memorial dialogue tree |
| FLAG_013 | Child Fed | Moral Choice | Player gave food to the hungry child in Market Row | Active | "That little one's been eating proper — someone's looking out for her." / "She told me a stranger fed her." | Market Row, South Gate, Undercroft | Low | Small compassion flag; combined with FLAG_001 unlocks "Heart of the City" ambient event |
| FLAG_014 | Name Spoken | Companion Bond | Player spoke companion Rho's true name in the temple scene | Active | "Rho seems unsettled — like they finally heard what they needed." / "You said the name. Everyone who knows Rho knows what that means." | Temple Row, Chapel Row, Scholar's Quarter | Medium | Key emotional beat for Rho's arc; unlocks hidden Act 3 dialogue |
| FLAG_015 | Blood Price Paid | Moral Choice | Player accepted punishment instead of letting a companion take the blame | Active | "Word is you took the lash meant for someone else." / "They say you stood up at the tribunal." | Civic District, Market Row, Dockside | High | Major reputation and companion trust flag; permanently affects tribunal NPCs |
| FLAG_016 | Fog Season | Weather | Active fog event is running (dynamic, low-visibility state) | Active | "Can't see my hand in front of my face — stay off the docks." / "The fog's in. Brings out the strange ones." | All Districts | Low | Real-time weather flag companion to Rain On; enables fog-specific ambient lines |
| FLAG_017 | Compact Honored | Reputation | Player fulfilled all three promises to the Merchant Compact | Active | "The Compact's talking about you like you're one of their own." / "You kept your word three times — rarer than coin." | Market Row, Harbor Gate, Civic District | Medium | Unlocks Compact discounts and a faction questline branch |
| FLAG_018 | Grave Visited | World State | Player visited and interacted with the unmarked grave in Undercroft | Active | "You went down to the unmarked plot — most people pretend it isn't there." / "Someone left flowers on the old grave." | Undercroft, Chapel Row | Low | Ambient atmosphere flag; triggers three hidden lore NPC dialogues |
| FLAG_019 | Duel Refused | Moral Choice | Player declined the honor duel challenge from the rival faction captain | Active | "You walked away from Cassia's challenge — smart or cowardly, depends who you ask." / "Refusing a duel in this city isn't nothing." | Civic District, North Gate, Old Quarter | Medium | Affects rival faction hostility; alternative to Duel Accepted flag |
| FLAG_020 | Festival Joined | World State | Player participated in the Lantern Festival street event | Active | "I saw you dancing in the square — you fit right in." / "The festival's better when outsiders join." | Old Quarter, Civic Green, Market Row | Low | Seasonal flag; unlocks festival merchant; sets warm-disposition baseline in Old Quarter |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |
|  |  |  |  | - |  |  |  |  |

## NPC Coverage Tracker

| Whole City Remembers — NPC Coverage Tracker |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NPC Name | District | NPC Role | Flags Referenced | Flag Count | Coverage Notes | Last Updated | Status |
| Della Maren | Dockside | Quest NPC | FLAG_004, FLAG_012, FLAG_015 |  | Primary quest contact; needs flood aftermath branch | 2026-07-01 00:00:00 | In Progress |
| Aldric the Foreman | Dockside | Antagonist | FLAG_007, FLAG_012 |  | Hostile state lines complete; flood reaction missing | 2026-07-10 00:00:00 | In Progress |
| Mira the Vendor | Market Row | Street Vendor | FLAG_001, FLAG_013, FLAG_017 |  | All ambient lines drafted | 2026-06-15 00:00:00 | Complete |
| Guard Captain Solen | Civic District | Guard Captain | FLAG_009, FLAG_015, FLAG_019 |  | Curfew and tribunal lines done; duel refusal pending | 2026-07-05 00:00:00 | In Progress |
| Brother Ossian | Temple Row | Temple Priest | FLAG_004, FLAG_014, FLAG_018 |  | Name Spoken and Grave Visited lines written | 2026-06-20 00:00:00 | Complete |
| Tam (street child) | South Gate | Child | FLAG_001, FLAG_013 |  | Short lines only; warm reaction to both flags | 2026-07-12 00:00:00 | Complete |
| Kessa the Innkeeper | Old Quarter | Innkeeper | FLAG_002, FLAG_003, FLAG_016, FLAG_020 |  | Weather lines done; Festival and Bench lines pending | 2026-07-08 00:00:00 | In Progress |
| Vael (companion) | Clock Tower Plaza | Companion | FLAG_008, FLAG_015, FLAG_019 |  | Midnight Pact scene written; other reactions not started | 2026-07-14 00:00:00 | In Progress |
| Rho (companion) | Scholar's Quarter | Companion | FLAG_010, FLAG_011, FLAG_014 |  | Name Spoken line is centerpiece; archive branch pending | 2026-07-03 00:00:00 | In Progress |
| Scholar Yuen | Scholar's Quarter | Scholar | FLAG_010, FLAG_011 |  | Archive branch reactions complete for both outcomes | 2026-06-28 00:00:00 | Complete |
| Elsa the Apothecary | The Warrens | Healer | FLAG_006, FLAG_012 |  | Clinic funding line done; flood warning line not started | 2026-07-15 00:00:00 | In Progress |
| Dock Laborer Petyr | Harbor Gate | Dockworker | FLAG_007, FLAG_012, FLAG_017 |  | All three lines drafted | 2026-07-02 00:00:00 | Complete |
| The Groundskeeper | Undercroft | Groundskeeper | FLAG_001, FLAG_018 |  | Strays and Grave lines written | 2026-06-30 00:00:00 | Complete |
| Cassian Dusk | North Gate | Rival Captain | FLAG_019 |  | Only references duel refusal; may expand | 2026-07-11 00:00:00 | Complete |
| Mourner Helaine | Chapel Row | Mourner | FLAG_005, FLAG_018 |  | Lantern and Grave lines complete | 2026-06-25 00:00:00 | Complete |
| Compact Broker Finch | Market Row | Merchant | FLAG_017, FLAG_009 |  | Compact lines done; curfew wariness not started | 2026-07-09 00:00:00 | In Progress |
| Festival Elder | Civic Green | Event NPC | FLAG_020, FLAG_005 |  | Festival lines written; lantern line pending | 2026-07-13 00:00:00 | In Progress |
| Night Watchman Boro | East Alley | Guard | FLAG_003, FLAG_016, FLAG_005 |  | Weather and lantern ambient lines all complete | 2026-06-22 00:00:00 | Complete |
| Della's Neighbor | The Warrens | Civilian | FLAG_004, FLAG_006 |  | Sister Told reaction written; clinic line not started | 2026-07-16 00:00:00 | Not Started |
| Archive Clerk | The Spire | Scholar | FLAG_010, FLAG_011 |  | Both archive outcomes need lines | 2026-07-17 00:00:00 | Not Started |
| Tavern Drunk | Old Quarter | Civilian | FLAG_002, FLAG_020, FLAG_003 |  | Comic ambient lines drafted for all three | 2026-07-04 00:00:00 | Complete |
| Harbor Fisherman | Harbor Gate | Civilian | FLAG_012, FLAG_007 |  | Flood and foreman lines not started | 2026-07-18 00:00:00 | Not Started |
| Tribunal Guard | Civic District | Guard | FLAG_015, FLAG_009 |  | Blood Price line is high priority; curfew done | 2026-07-06 00:00:00 | In Progress |
| Chapel Candle Seller | Chapel Row | Street Vendor | FLAG_005, FLAG_016 |  | Both lines written | 2026-06-27 00:00:00 | Complete |
| Old Soldier Wren | North Bridge | Veteran | FLAG_002, FLAG_015, FLAG_019 |  | Bench and tribunal lines resonant; duel pending | 2026-07-07 00:00:00 | In Progress |
| SUMMARY |  |  |  |  |  |  |  |
| Total NPCs Tracked |  |  |  |  |  |  |  |
| Flags With Coverage |  |  |  |  |  |  |  |
| Coverage % |  |  |  |  |  |  |  |
| Flag Coverage Audit |  |  |  |  |  |  |  |
| Flag ID | NPC Count |  |  |  |  |  |  |
| FLAG_001 |  |  |  |  |  |  |  |
| FLAG_002 |  |  |  |  |  |  |  |
| FLAG_003 |  |  |  |  |  |  |  |
| FLAG_004 |  |  |  |  |  |  |  |
| FLAG_005 |  |  |  |  |  |  |  |
| FLAG_006 |  |  |  |  |  |  |  |
| FLAG_007 |  |  |  |  |  |  |  |
| FLAG_008 |  |  |  |  |  |  |  |
| FLAG_009 |  |  |  |  |  |  |  |
| FLAG_010 |  |  |  |  |  |  |  |
| FLAG_011 |  |  |  |  |  |  |  |
| FLAG_012 |  |  |  |  |  |  |  |
| FLAG_013 |  |  |  |  |  |  |  |
| FLAG_014 |  |  |  |  |  |  |  |
| FLAG_015 |  |  |  |  |  |  |  |
| FLAG_016 |  |  |  |  |  |  |  |
| FLAG_017 |  |  |  |  |  |  |  |
| FLAG_018 |  |  |  |  |  |  |  |
| FLAG_019 |  |  |  |  |  |  |  |
| FLAG_020 |  |  |  |  |  |  |  |
