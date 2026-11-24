import fs from "fs";
import path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

async function pushToRemote() {
  const dir = path.resolve(".");
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    console.log("=======================================================");
    console.log("GitHub Remote Push Helper");
    console.log("Remote: https://github.com/muhamedarsath74-alt/Iot.git");
    console.log("Branch: main");
    console.log("=======================================================");
    console.log("A GitHub Personal Access Token (PAT) is required to push.");
    console.log("\nTo push now, run either:");
    console.log("  node pushToGitHub.js <YOUR_GITHUB_TOKEN>");
    console.log("Or:");
    console.log("  $env:GITHUB_TOKEN=\"<YOUR_GITHUB_TOKEN>\"; npm run push");
    console.log("=======================================================");
    process.exit(1);
  }

  console.log("Pushing main branch to https://github.com/muhamedarsath74-alt/Iot.git ...");

  try {
    const pushResult = await git.push({
      fs,
      http,
      dir,
      remote: "origin",
      ref: "main",
      onAuth: () => ({
        username: token,
        password: ""
      })
    });

    console.log("=======================================================");
    console.log("PUSH SUCCESSFUL!");
    console.log("Repository live at: https://github.com/muhamedarsath74-alt/Iot");
    console.log("=======================================================");
  } catch (err) {
    console.error("Push failed:", err.message);
    if (err.data) console.error("Details:", err.data);
    process.exit(1);
  }
}

pushToRemote();
