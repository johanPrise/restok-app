import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
// @ts-expect-error pg types not installed
import { Client } from 'pg';

loadEnv();

const BCRYPT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password123!';

// Simple, memorable, structured UUIDs
export const IDS = {
  // 1. Colocation
  colocGroup: '11111111-1111-1111-1111-111111111111',
  colocAdmin: '11111111-0000-0000-0000-000000000001',
  colocBob: '11111111-0000-0000-0000-000000000002',
  colocCharlie: '11111111-0000-0000-0000-000000000003',
  colocItems: {
    pq: '11111111-1111-0000-0000-000000000001',
    vaisselle: '11111111-1111-0000-0000-000000000002',
    poubelle: '11111111-1111-0000-0000-000000000003',
    pates: '11111111-1111-0000-0000-000000000004',
    cafe: '11111111-1111-0000-0000-000000000005',
    lait: '11111111-1111-0000-0000-000000000006',
    huile: '11111111-1111-0000-0000-000000000007',
    oeufs: '11111111-1111-0000-0000-000000000008',
  },
  colocRecipes: {
    carbonara: '11111111-2222-0000-0000-000000000001',
    cafeLatte: '11111111-2222-0000-0000-000000000002',
  },

  // 2. Association
  assoGroup: '22222222-2222-2222-2222-222222222222',
  assoAdmin: '22222222-0000-0000-0000-000000000001',
  assoBenevole: '22222222-0000-0000-0000-000000000002',
  assoItems: {
    gobelets: '22222222-1111-0000-0000-000000000001',
    cafeGrains: '22222222-1111-0000-0000-000000000002',
    jusPomme: '22222222-1111-0000-0000-000000000003',
    serviettes: '22222222-1111-0000-0000-000000000004',
    savon: '22222222-1111-0000-0000-000000000005',
    sacs100l: '22222222-1111-0000-0000-000000000006',
    rizVrac: '22222222-1111-0000-0000-000000000007',
  },
  assoRecipes: {
    buffetAg: '22222222-2222-0000-0000-000000000001',
    chili: '22222222-2222-0000-0000-000000000002',
  },

  // 3. Solo
  soloGroup: '33333333-3333-3333-3333-333333333333',
  soloMember: '33333333-0000-0000-0000-000000000001',
  soloItems: {
    beurre: '33333333-1111-0000-0000-000000000001',
    theVert: '33333333-1111-0000-0000-000000000002',
    lessive: '33333333-1111-0000-0000-000000000003',
    rizThai: '33333333-1111-0000-0000-000000000004',
    chocolat: '33333333-1111-0000-0000-000000000005',
  },
  soloRecipes: {
    rizSaute: '33333333-2222-0000-0000-000000000001',
  },

  // 4. Compte sans groupe (pour tester l'onboarding / invitation)
  nouveauMember: '44444444-0000-0000-0000-000000000001',
};

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5434),
    user: process.env.DB_USER ?? 'restock',
    password: process.env.DB_PASSWORD ?? 'restock',
    database: process.env.DB_NAME ?? 'restock',
  });

  await client.connect();
  console.log('Connecté à la base de données PostgreSQL...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 3600 * 1000);

  try {
    await client.query('BEGIN');

    console.log('Nettoyage des données existantes...');
    await client.query(`
      TRUNCATE TABLE 
        "action_history", 
        "recipe_ingredient", 
        "recipe", 
        "shopping_line", 
        "purchase", 
        "password_reset", 
        "refresh_token", 
        "item", 
        "member", 
        "group" 
      CASCADE;
    `);

    // =========================================================================
    // 1. CAS COLOCATION (Roommates)
    // =========================================================================
    console.log('Création du cas 1 : Colocation...');
    await client.query(
      `INSERT INTO "group" (id, name, type, invite_code, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [IDS.colocGroup, 'Coloc du Canal', 'roommates', 'COLOC123', sixMonthsAgo],
    );

    await client.query(
      `INSERT INTO "member" (id, name, email, password, role, group_id, joined_at, created_at)
       VALUES 
       ($1, 'Alice (Admin)', 'alice@coloc.dev', $4, 'admin', $5, $6, $6),
       ($2, 'Bob (Coloc)', 'bob@coloc.dev', $4, 'member', $5, $7, $7),
       ($3, 'Charlie (Coloc)', 'charlie@coloc.dev', $4, 'member', $5, $8, $8)`,
      [
        IDS.colocAdmin,
        IDS.colocBob,
        IDS.colocCharlie,
        passwordHash,
        IDS.colocGroup,
        sixMonthsAgo,
        twoMonthsAgo,
        oneMonthAgo,
      ],
    );

    // Items de la colocation
    await client.query(
      `INSERT INTO "item" (id, group_id, name, status, tracking_type, quantity, low_threshold, target_quantity, unit, pack_size, format, created_at, updated_at)
       VALUES
       ($1, $9, 'Papier toilette', 'low', 'threshold', NULL, 1, NULL, NULL, NULL, '×12', $10, $10),
       ($2, $9, 'Liquide vaisselle', 'available', 'threshold', NULL, 1, NULL, NULL, NULL, '1 L', $10, $10),
       ($3, $9, 'Sacs poubelle 30L', 'out_of_stock', 'threshold', NULL, 1, NULL, NULL, NULL, 'Rouleau 20', $10, $10),
       ($4, $9, 'Pâtes Penne', 'available', 'quantity', 4, 2, 6, 'paquet', 1, '500 g', $10, $10),
       ($5, $9, 'Café moulu', 'low', 'quantity', 1, 2, 4, 'paquet', 1, '250 g', $10, $10),
       ($6, $9, 'Lait demi-écrémé', 'available', 'quantity', 6, 2, 6, 'bouteille', 6, '1 L', $10, $10),
       ($7, $9, 'Huile d''olive', 'to_restock', 'threshold', NULL, 1, NULL, NULL, NULL, '75 cL', $10, $10),
       ($8, $9, 'Œufs bio', 'low', 'quantity', 2, 4, 12, 'œuf', 6, 'Boîte de 6', $10, $10)`,
      [
        IDS.colocItems.pq,
        IDS.colocItems.vaisselle,
        IDS.colocItems.poubelle,
        IDS.colocItems.pates,
        IDS.colocItems.cafe,
        IDS.colocItems.lait,
        IDS.colocItems.huile,
        IDS.colocItems.oeufs,
        IDS.colocGroup,
        sixMonthsAgo,
      ],
    );

    // Courses de la colocation (liées et libres)
    await client.query(
      `INSERT INTO "shopping_line" (id, group_id, item_id, label, quantity, checked, checked_by_id, checked_at, added_by_id, created_at, updated_at)
       VALUES
       (gen_random_uuid(), $1, $2, NULL, NULL, false, NULL, NULL, $5, $8, $8),
       (gen_random_uuid(), $1, $3, NULL, 2, false, NULL, NULL, $6, $8, $8),
       (gen_random_uuid(), $1, $4, NULL, NULL, true, $7, $8, $5, $8, $8),
       (gen_random_uuid(), $1, NULL, 'Pain de campagne', NULL, false, NULL, NULL, $6, $8, $8),
       (gen_random_uuid(), $1, NULL, 'Parmesan râpé', 1, true, $6, $8, $5, $8, $8)`,
      [
        IDS.colocGroup,
        IDS.colocItems.poubelle,
        IDS.colocItems.cafe,
        IDS.colocItems.huile,
        IDS.colocAdmin,
        IDS.colocBob,
        IDS.colocCharlie,
        now,
      ],
    );

    // Recettes de la colocation
    await client.query(
      `INSERT INTO "recipe" (id, group_id, name, source, description, servings, created_by_id, created_at, updated_at)
       VALUES
       ($1, $3, 'Pâtes Carbonara Traditionnelles', 'https://marmiton.org/recettes/carbonara', 'Sans crème ! Battre les jaunes d''œufs avec le pecorino/parmesan.', 4, $4, $5, $5),
       ($2, $3, 'Café Latte Onctueux', NULL, 'Faire mousser le lait chaud avant de verser le café.', 2, $4, $5, $5)`,
      [
        IDS.colocRecipes.carbonara,
        IDS.colocRecipes.cafeLatte,
        IDS.colocGroup,
        IDS.colocAdmin,
        oneMonthAgo,
      ],
    );

    await client.query(
      `INSERT INTO "recipe_ingredient" (id, recipe_id, item_id, label, position)
       VALUES
       (gen_random_uuid(), $1, $3, NULL, 1),
       (gen_random_uuid(), $1, $4, NULL, 2),
       (gen_random_uuid(), $1, NULL, 'Guanciale ou lardons fumés', 3),
       (gen_random_uuid(), $1, NULL, 'Pecorino ou Parmesan', 4),
       (gen_random_uuid(), $1, NULL, 'Poivre noir moulu', 5),
       (gen_random_uuid(), $2, $5, NULL, 1),
       (gen_random_uuid(), $2, $6, NULL, 2),
       (gen_random_uuid(), $2, NULL, 'Sirop de caramel (optionnel)', 3)`,
      [
        IDS.colocRecipes.carbonara,
        IDS.colocRecipes.cafeLatte,
        IDS.colocItems.pates,
        IDS.colocItems.oeufs,
        IDS.colocItems.cafe,
        IDS.colocItems.lait,
      ],
    );

    // Journal d'actions colocation
    await client.query(
      `INSERT INTO "action_history" (id, item_id, member_id, action_type, quantity, created_at)
       VALUES
       (gen_random_uuid(), $1, $5, 'taken', 1, $8),
       (gen_random_uuid(), $2, $6, 'restocked', 6, $9),
       (gen_random_uuid(), $3, $7, 'taken', NULL, $10),
       (gen_random_uuid(), $4, $5, 'restocked', 2, $11)`,
      [
        IDS.colocItems.cafe,
        IDS.colocItems.lait,
        IDS.colocItems.pq,
        IDS.colocItems.pates,
        IDS.colocAdmin,
        IDS.colocBob,
        IDS.colocCharlie,
        new Date(now.getTime() - 3 * 3600 * 1000),
        new Date(now.getTime() - 24 * 3600 * 1000),
        new Date(now.getTime() - 48 * 3600 * 1000),
        new Date(now.getTime() - 72 * 3600 * 1000),
      ],
    );

    // =========================================================================
    // 2. CAS ASSOCIATION (Association)
    // =========================================================================
    console.log('Création du cas 2 : Association...');
    await client.query(
      `INSERT INTO "group" (id, name, type, invite_code, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        IDS.assoGroup,
        "L'Atelier Solidaire (Asso)",
        'association',
        'ASSO2026',
        sixMonthsAgo,
      ],
    );

    await client.query(
      `INSERT INTO "member" (id, name, email, password, role, group_id, joined_at, created_at)
       VALUES 
       ($1, 'Diane (Trésorière)', 'diane@asso.dev', $3, 'admin', $4, $5, $5),
       ($2, 'Étienne (Bénévole)', 'etienne@asso.dev', $3, 'member', $4, $6, $6)`,
      [
        IDS.assoAdmin,
        IDS.assoBenevole,
        passwordHash,
        IDS.assoGroup,
        sixMonthsAgo,
        twoMonthsAgo,
      ],
    );

    // Items de l'association
    await client.query(
      `INSERT INTO "item" (id, group_id, name, status, tracking_type, quantity, low_threshold, target_quantity, unit, pack_size, format, created_at, updated_at)
       VALUES
       ($1, $8, 'Gobelets réutilisables ecocup', 'available', 'quantity', 150, 30, 200, 'gobelet', 50, 'Carton 50', $9, $9),
       ($2, $8, 'Café en grains bio', 'low', 'quantity', 1, 3, 6, 'kg', 1, '1 kg', $9, $9),
       ($3, $8, 'Jus de pomme local', 'available', 'quantity', 12, 6, 24, 'bouteille', 6, '1 L', $9, $9),
       ($4, $8, 'Serviettes en papier', 'low', 'threshold', NULL, 1, NULL, NULL, NULL, 'Paquet 100', $9, $9),
       ($5, $8, 'Savon mains atelier', 'available', 'threshold', NULL, 1, NULL, NULL, NULL, 'Flacon 500 mL', $9, $9),
       ($6, $8, 'Sacs poubelle 100L', 'to_restock', 'threshold', NULL, 1, NULL, NULL, NULL, 'Rouleau 20', $9, $9),
       ($7, $8, 'Riz basmati vrac', 'available', 'quantity', 5, 2, 10, 'kg', 5, 'Sac 5 kg', $9, $9)`,
      [
        IDS.assoItems.gobelets,
        IDS.assoItems.cafeGrains,
        IDS.assoItems.jusPomme,
        IDS.assoItems.serviettes,
        IDS.assoItems.savon,
        IDS.assoItems.sacs100l,
        IDS.assoItems.rizVrac,
        IDS.assoGroup,
        sixMonthsAgo,
      ],
    );

    // Courses association
    await client.query(
      `INSERT INTO "shopping_line" (id, group_id, item_id, label, quantity, checked, checked_by_id, checked_at, added_by_id, created_at, updated_at)
       VALUES
       (gen_random_uuid(), $1, $2, NULL, 4, false, NULL, NULL, $4, $6, $6),
       (gen_random_uuid(), $1, $3, NULL, NULL, false, NULL, NULL, $5, $6, $6),
       (gen_random_uuid(), $1, NULL, 'Thé vert à la menthe vrac', NULL, true, $4, $6, $4, $6, $6)`,
      [
        IDS.assoGroup,
        IDS.assoItems.cafeGrains,
        IDS.assoItems.sacs100l,
        IDS.assoAdmin,
        IDS.assoBenevole,
        now,
      ],
    );

    // Recettes association
    await client.query(
      `INSERT INTO "recipe" (id, group_id, name, source, description, servings, created_by_id, created_at, updated_at)
       VALUES
       ($1, $3, 'Buffet Accueil Assemblée Générale', NULL, 'Prévoir 2 thermos de café chaud et disposer les ecocups.', 30, $4, $5, $5),
       ($2, $3, 'Chili Solidaire des Bénévoles', 'Livre de cuisine solidaire', 'Mijoté convivial servi avec le riz basmati.', 20, $4, $5, $5)`,
      [
        IDS.assoRecipes.buffetAg,
        IDS.assoRecipes.chili,
        IDS.assoGroup,
        IDS.assoAdmin,
        oneMonthAgo,
      ],
    );

    await client.query(
      `INSERT INTO "recipe_ingredient" (id, recipe_id, item_id, label, position)
       VALUES
       (gen_random_uuid(), $1, $3, NULL, 1),
       (gen_random_uuid(), $1, $4, NULL, 2),
       (gen_random_uuid(), $1, $5, NULL, 3),
       (gen_random_uuid(), $1, NULL, 'Biscuits secs variés', 4),
       (gen_random_uuid(), $2, $6, NULL, 1),
       (gen_random_uuid(), $2, NULL, 'Haricots rouges en boîte', 2),
       (gen_random_uuid(), $2, NULL, 'Sauce tomate pelée', 3),
       (gen_random_uuid(), $2, NULL, 'Mélange épices chili doux', 4)`,
      [
        IDS.assoRecipes.buffetAg,
        IDS.assoRecipes.chili,
        IDS.assoItems.cafeGrains,
        IDS.assoItems.jusPomme,
        IDS.assoItems.gobelets,
        IDS.assoItems.rizVrac,
      ],
    );

    // Journal association
    await client.query(
      `INSERT INTO "action_history" (id, item_id, member_id, action_type, quantity, created_at)
       VALUES
       (gen_random_uuid(), $1, $4, 'taken', 2, $5),
       (gen_random_uuid(), $2, $3, 'restocked', 12, $6),
       (gen_random_uuid(), $1, $3, 'restocked', 4, $7)`,
      [
        IDS.assoItems.cafeGrains,
        IDS.assoItems.jusPomme,
        IDS.assoAdmin,
        IDS.assoBenevole,
        new Date(now.getTime() - 2 * 3600 * 1000),
        new Date(now.getTime() - 24 * 3600 * 1000),
        new Date(now.getTime() - 50 * 3600 * 1000),
      ],
    );

    // =========================================================================
    // 3. CAS COMPTE SOLO (Solo)
    // =========================================================================
    console.log('Création du cas 3 : Compte Solo...');
    await client.query(
      `INSERT INTO "group" (id, name, type, invite_code, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [IDS.soloGroup, 'Mon Foyer Solo', 'solo', 'SOLO0001', twoMonthsAgo],
    );

    await client.query(
      `INSERT INTO "member" (id, name, email, password, role, group_id, joined_at, created_at)
       VALUES ($1, 'François (Solo)', 'francois@solo.dev', $2, 'admin', $3, $4, $4)`,
      [IDS.soloMember, passwordHash, IDS.soloGroup, twoMonthsAgo],
    );

    // Items solo
    await client.query(
      `INSERT INTO "item" (id, group_id, name, status, tracking_type, quantity, low_threshold, target_quantity, unit, pack_size, format, created_at, updated_at)
       VALUES
       ($1, $6, 'Beurre demi-sel', 'available', 'quantity', 2, 1, 3, 'plaquette', 1, '250 g', $7, $7),
       ($2, $6, 'Thé vert Sencha', 'available', 'threshold', NULL, 1, NULL, NULL, NULL, 'Boîte 100g', $7, $7),
       ($3, $6, 'Lessive liquide écolo', 'low', 'threshold', NULL, 1, NULL, NULL, NULL, '1,5 L', $7, $7),
       ($4, $6, 'Riz Thaï', 'available', 'quantity', 1, 1, 2, 'paquet', 1, '1 kg', $7, $7),
       ($5, $6, 'Chocolat noir 85%', 'out_of_stock', 'quantity', 0, 1, 3, 'tablette', 1, '100 g', $7, $7)`,
      [
        IDS.soloItems.beurre,
        IDS.soloItems.theVert,
        IDS.soloItems.lessive,
        IDS.soloItems.rizThai,
        IDS.soloItems.chocolat,
        IDS.soloGroup,
        twoMonthsAgo,
      ],
    );

    // Courses solo
    await client.query(
      `INSERT INTO "shopping_line" (id, group_id, item_id, label, quantity, checked, checked_by_id, checked_at, added_by_id, created_at, updated_at)
       VALUES
       (gen_random_uuid(), $1, $2, NULL, NULL, false, NULL, NULL, $4, $5, $5),
       (gen_random_uuid(), $1, $3, NULL, 2, false, NULL, NULL, $4, $5, $5),
       (gen_random_uuid(), $1, NULL, 'Pommes Golden bio (1 kg)', NULL, true, $4, $5, $4, $5, $5)`,
      [
        IDS.soloGroup,
        IDS.soloItems.lessive,
        IDS.soloItems.chocolat,
        IDS.soloMember,
        now,
      ],
    );

    // Recettes solo
    await client.query(
      `INSERT INTO "recipe" (id, group_id, name, source, description, servings, created_by_id, created_at, updated_at)
       VALUES
       ($1, $2, 'Riz sauté aux légumes & beurre', NULL, 'Cuire le riz puis le faire sauter avec les carottes et une noisette de beurre.', 1, $3, $4, $4)`,
      [
        IDS.soloRecipes.rizSaute,
        IDS.soloGroup,
        IDS.soloMember,
        oneMonthAgo,
      ],
    );

    await client.query(
      `INSERT INTO "recipe_ingredient" (id, recipe_id, item_id, label, position)
       VALUES
       (gen_random_uuid(), $1, $2, NULL, 1),
       (gen_random_uuid(), $1, $3, NULL, 2),
       (gen_random_uuid(), $1, NULL, 'Carottes fraîches', 3),
       (gen_random_uuid(), $1, NULL, 'Sauce soja tamari', 4)`,
      [
        IDS.soloRecipes.rizSaute,
        IDS.soloItems.rizThai,
        IDS.soloItems.beurre,
      ],
    );

    // Journal solo
    await client.query(
      `INSERT INTO "action_history" (id, item_id, member_id, action_type, quantity, created_at)
       VALUES
       (gen_random_uuid(), $1, $3, 'taken', 1, $4),
       (gen_random_uuid(), $2, $3, 'taken', 1, $5)`,
      [
        IDS.soloItems.beurre,
        IDS.soloItems.chocolat,
        IDS.soloMember,
        new Date(now.getTime() - 4 * 3600 * 1000),
        new Date(now.getTime() - 26 * 3600 * 1000),
      ],
    );

    // =========================================================================
    // 4. CAS COMPTE ONBOARDING SANS GROUPE
    // =========================================================================
    console.log('Création du cas 4 : Nouveau compte sans groupe...');
    await client.query(
      `INSERT INTO "member" (id, name, email, password, role, group_id, joined_at, created_at)
       VALUES ($1, 'Nouveau Membre', 'nouveau@restock.dev', $2, 'member', NULL, NULL, $3)`,
      [IDS.nouveauMember, passwordHash, now],
    );

    await client.query('COMMIT');
    console.log('✅ Base de données seedée avec succès !');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur pendant le seed :', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
