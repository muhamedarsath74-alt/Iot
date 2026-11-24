import fs from "fs";
import path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

async function pushToRemote() {
  const dir = path.resolve(".");
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    console.log("No token provided.");
    process.exit(1);
  }

  console.log("Pushing main branch to https://github.com/muhamedarsath74-alt/Iot.git with force=true...");

  try {
    const pushResult = await git.push({
      fs,
      http,
      dir,
      remote: "origin",
      ref: "main",
      force: true,
      onAuth: () => ({
        username: token,
        password: ""
      })
    });

    console.log("=======================================================");
    console.log("PUSH SUCCESSFUL!");
    console.log("Repository is now live at: https://github.com/muhamedarsath74-alt/Iot");
    console.log("=======================================================");
  } catch (err) {
    console.error("Push failed:", err.message);
    if (err.data) console.error("Details:", err.data);
    process.exit(1);
  }
}

pushToRemote();
