-- Listino e dati di prova. Serve ad avere schermate piene mentre si sviluppa:
-- una lista vuota nasconde i problemi di allineamento e di troncamento.

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

with nuovi_clienti as (
  insert into clienti (ragione_sociale, partita_iva, telefono, email) values
    ('Condominio Via Manzoni 14', null, '0301234567', 'amministratore@viamanzoni14.test'),
    ('Panificio Rossi S.r.l.', '01234567890', '0307654321', 'info@panificiorossi.test'),
    ('Bianchi Marco', null, '3391112223', 'marco.bianchi@posta.test')
  returning id, ragione_sociale
),
nuove_sedi as (
  insert into sedi (cliente_id, etichetta, indirizzo, comune, cap, note_accesso)
  select id, 'Sede principale', 'Via Manzoni 14', 'Brescia', '25121', 'Chiavi dal portiere'
  from nuovi_clienti where ragione_sociale = 'Condominio Via Manzoni 14'
  union all
  select id, 'Laboratorio', 'Via Industriale 8', 'Brescia', '25125', 'Aperto dalle 5 alle 13'
  from nuovi_clienti where ragione_sociale = 'Panificio Rossi S.r.l.'
  union all
  select id, 'Negozio', 'Corso Zanardelli 40', 'Brescia', '25121', null
  from nuovi_clienti where ragione_sociale = 'Panificio Rossi S.r.l.'
  union all
  select id, 'Abitazione', 'Via Sereno 3', 'Rezzato', '25086', 'Citofono Bianchi'
  from nuovi_clienti where ragione_sociale = 'Bianchi Marco'
  returning id, etichetta
)
insert into impianti (sede_id, tipo, marca, modello, matricola, ultima_manutenzione, intervallo_mesi)
select id, 'caldaia'::tipo_impianto, 'Vaillant', 'ecoTEC plus', 'VA-88120',
       (current_date - interval '13 months')::date, 12
  from nuove_sedi where etichetta = 'Sede principale'
union all
select id, 'condizionatore'::tipo_impianto, 'Daikin', 'Perfera 12', 'DK-55021',
       (current_date - interval '11 months')::date, 12
  from nuove_sedi where etichetta = 'Negozio'
union all
select id, 'pompa_calore'::tipo_impianto, 'Mitsubishi', 'Ecodan 8kW', 'MI-70310',
       (current_date - interval '5 months')::date, 12
  from nuove_sedi where etichetta = 'Abitazione';
