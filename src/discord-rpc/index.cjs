// Dave Caruso

// This hacked together node.js script fetches current task from TrackingTime and then updates
// my discord status in by using RPC and multiple custom client ids. RPC allows extra customization
// of the status message, and using my personal token to do anything is forbidden by Discord.

process.chdir(__dirname + "/../../");
require("dotenv/config");

const RPC = require("discord-rpc");
const fs = require("fs");

const clientIds = {
  sleep: "1035638029156618241",
  outside: "1035655257763622993",
  work: "1035630419762229279",
};

async function fetchTT(url) {
  const { response, data } = await fetch(url, {
    headers: {
      Authorization: `Basic ${process.env.TT_TOKEN}`,
      "User-Agent": "Dave's Personal Automation (me@paperdave.net)",
    },
  }).then((res) => res.json());

  if (response.message !== "ok") {
    throw new Error(response.message);
  }

  return data;
}

async function refresh() {
  const tracking = await fetchTT(
    `https://app.trackingtime.co/api/v4/users/${process.env.TT_USER_ID}/tasks/tracking`
  );

  if (tracking.length === 0) {
    fs.writeFileSync("/tmp/current-task.txt", "no task");
    updateClient({
      clientId: clientIds.work,
      details: `idle`,
    });
    return;
  }

  const event = (
    await fetchTT(
      `https://app.trackingtime.co/api/v4/events?filter=COMPANY&page=0&page_size=1&order=desc`
    )
  )[0];

  fs.writeFileSync(
    "/tmp/current-task.txt",
    `task: ${event.task}${event.project ? ` - ${event.project}` : ""}`
  );

  if (event.task_id === 10871196) {
    // sleep
    updateClient({
      clientId: clientIds.sleep,
      startTimestamp: new Date(event.start_date).getTime(),
      details: "zzzz",
    });
  } else if (event.task_id === 10862585) {
    // Social
    updateClient({
      clientId: clientIds.outside,
      startTimestamp: new Date(event.start_date).getTime(),
      details: "i'm with friends, somehow",
      state: "might not respond",
    });
  } else if (event.task_id === 10862584) {
    // Outside
    updateClient({
      clientId: clientIds.outside,
      startTimestamp: new Date(event.start_date).getTime(),
      details: "alone, never lonely",
      state: "might respond",
    });
  } else {
    console.log("unknown task", event.task, event.task_id);
    updateClient({
      clientId: clientIds.work,
      startTimestamp: new Date(event.start).getTime(),
      details: `task: ${event.task}`,
      state: event.project ? `project: ${event.project}` : undefined,
    });
  }
}

let client = null;
let currentClientId;
/** Updates the client status, creating a new client if needed. */
async function updateClient({ clientId, ...args }) {
  if (client && clientId !== currentClientId) {
    console.log("destroying client");
    client.destroy();
    client = null;
  }

  if (!client && clientId) {
    console.log("creating client");
    currentClientId = clientId;
    client = new RPC.Client({ transport: "ipc" });
    await client.login({ clientId });
  }

  client?.setActivity({
    ...args,
    instance: true,
  });
}

// TODO: use websocket instead of this polling approach
refresh().then(() => {
  setInterval(refresh, 30e3);
});
