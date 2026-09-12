-- Listino di partenza, senza dati inventati: va bene anche in produzione.
-- I prezzi sono un punto di partenza da correggere con quelli veri del
-- fornitore, dalla schermata del listino.

insert into materiali (codice, descrizione, unita, prezzo_acquisto, prezzo_vendita) values
  ('TUB-CU-15', 'Tubo rame ricotto 15 mm', 'm', 4.10, 7.50),
  ('TUB-CU-18', 'Tubo rame ricotto 18 mm', 'm', 5.30, 9.20),
  ('TUB-MU-16', 'Tubo multistrato 16x2', 'm', 2.40, 4.60),
  ('RAC-90-15', 'Curva 90 gradi 15 mm', 'pz', 1.10, 2.80),
  ('RAC-TE-15', 'Raccordo a T 15 mm', 'pz', 1.80, 4.10),
  ('RAC-NIP-12', 'Nipples ottone 1/2', 'pz', 0.90, 2.40),
  ('VAL-SFE-12', 'Valvola a sfera 1/2', 'pz', 4.50, 11.00),
  ('VAL-SFE-34', 'Valvola a sfera 3/4', 'pz', 6.20, 14.50),
  ('VAL-TER-15', 'Valvola termostatica 15 mm', 'pz', 12.00, 29.00),
  ('VAL-SIC-3', 'Valvola di sicurezza 3 bar', 'pz', 8.40, 19.00),
  ('GUA-CAN-12', 'Guarnizione canapa 1/2', 'pz', 0.20, 0.90),
  ('GUA-OR-20', 'Guarnizione OR 20 mm', 'pz', 0.30, 1.10),
  ('VAS-EXP-8', 'Vaso espansione 8 litri', 'pz', 22.00, 48.00),
  ('POM-CIR-25', 'Circolatore 25-40', 'pz', 78.00, 149.00),
  ('SON-NTC', 'Sonda NTC caldaia', 'pz', 9.50, 24.00),
  ('SCA-PIA-20', 'Scambiatore a piastre 20 elementi', 'pz', 64.00, 128.00),
  ('FIL-DEF-34', 'Filtro defangatore 3/4', 'pz', 31.00, 69.00),
  ('GAS-R32-1', 'Ricarica gas R32 per kg', 'kg', 14.00, 35.00),
  ('STA-TUB-16', 'Staffa per tubo 16 mm', 'pz', 0.40, 1.30),
  ('MAN-PRE-4', 'Manometro 0-4 bar', 'pz', 7.10, 17.50)
on conflict (codice) do nothing;
