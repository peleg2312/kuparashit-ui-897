const DB_NAME = "kupa_rashit";
const TYPE_COLLECTION = "catalog_type_definitions";
const COLLECTION_NAME = "TestSystems40";

const fieldSpecs = [
  { key: "name", label: "Name", type: "string", active: true, order: 1 },
  { key: "url", label: "URL", type: "url", active: true, order: 2 },
  { key: "site", label: "Site", type: "string", active: true, order: 3 },
  { key: "datacenter", label: "Datacenter", type: "string", active: true, order: 4 },
  { key: "platform", label: "Platform", type: "string", active: true, order: 5 },
  { key: "status", label: "Status", type: "string", active: true, order: 6 },
  { key: "rack", label: "Rack", type: "number", active: true, order: 7 },
  { key: "critical", label: "Critical", type: "boolean", active: true, order: 8 },
  { key: "tags", label: "Tags", type: "array", active: true, order: 9 },
  { key: "contacts", label: "Contacts", type: "dict", active: true, order: 10 },
  { key: "systems", label: "Systems", type: "dict", active: true, order: 11 },
];

const sites = ["tel aviv", "haifa", "beer sheva", "jerusalem", "eilat"];
const datacenters = ["ta-dc-1", "hf-dc-2", "bs-dc-1", "jr-dc-3", "el-dc-1"];
const platforms = ["powermax", "netapp", "vmware", "backup", "linux"];
const statuses = ["healthy", "warning", "maintenance", "degraded"];
const ownerTeams = ["BLOCK", "NASA"];
const roles = ["prod", "dr", "backup", "analytics", "management"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function buildSystems(index, platform) {
  const result = {};
  const systemCount = (index % 3) + 1;

  for (let offset = 0; offset < systemCount; offset += 1) {
    const sid = `${index + 1000}${offset + 1}`;
    result[sid] = {
      name: `${platform}-node-${offset + 1}`,
      model: `${platform.toUpperCase()}-${7000 + index + offset}`,
      firmware: `v${1 + (index % 3)}.${offset + 1}.${(index % 9) + 1}`,
      roles: [roles[(index + offset) % roles.length], roles[(index + offset + 2) % roles.length]],
      ports: {
        fc: 8 + ((index + offset) % 6) * 4,
        ethernet: 2 + ((index + offset) % 4) * 2,
      },
    };
  }

  return result;
}

function buildDocument(index) {
  const sequence = index + 1;
  const site = sites[index % sites.length];
  const datacenter = datacenters[index % datacenters.length];
  const platform = platforms[index % platforms.length];
  const status = statuses[index % statuses.length];
  const ownerTeam = ownerTeams[index % ownerTeams.length];
  const teams = index % 6 === 0 ? ["BLOCK", "NASA"] : [ownerTeam];
  const name = `test-system-${pad2(sequence)}`;

  return {
    name,
    url: `https://${name}.lab.local`,
    teams,
    site,
    datacenter,
    platform,
    status,
    rack: (index % 24) + 1,
    critical: index % 5 === 0,
    tags: [
      site.replace(/\s+/g, "-"),
      platform,
      status,
      ownerTeam.toLowerCase(),
    ],
    contacts: {
      owner: `${ownerTeam.toLowerCase()}-owner-${(index % 7) + 1}`,
      slack: `#${ownerTeam.toLowerCase()}-ops`,
      escalation: {
        primary: `eng-${pad2((index % 10) + 1)}`,
        secondary: `eng-${pad2(((index + 3) % 10) + 1)}`,
      },
    },
    systems: buildSystems(index, platform),
  };
}

const seedDocs = Array.from({ length: 40 }, (_, index) => buildDocument(index));

const targetDb = db.getSiblingDB(DB_NAME);

targetDb.getCollection(TYPE_COLLECTION).updateOne(
  { collectionName: COLLECTION_NAME },
  {
    $set: {
      collectionName: COLLECTION_NAME,
      fields: fieldSpecs,
      teams: ["BLOCK", "NASA"],
    },
  },
  { upsert: true }
);

const objectsCollection = targetDb.getCollection(COLLECTION_NAME);
objectsCollection.deleteMany({});
objectsCollection.insertMany(seedDocs);

printjson({
  ok: true,
  collectionName: COLLECTION_NAME,
  inserted: seedDocs.length,
  blockVisible: objectsCollection.countDocuments({
    $or: [{ team: "BLOCK" }, { teams: "BLOCK" }, { teams: { $exists: false } }],
    url: { $exists: true, $ne: "" },
  }),
  nasaVisible: objectsCollection.countDocuments({
    $or: [{ team: "NASA" }, { teams: "NASA" }, { teams: { $exists: false } }],
    url: { $exists: true, $ne: "" },
  }),
});
