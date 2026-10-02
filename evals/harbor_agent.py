"""Harbor adapter for harness: copies the compiled CLI (cli.ts, built by `bun run build:eval`)
into the task container and runs it on the task instruction. Used via `bun run eval`."""

import os
import shlex
from pathlib import Path

from harbor.agents.installed.base import BaseInstalledAgent, with_prompt_template
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext

DIST = Path(__file__).parent.parent / "dist-eval"
BIN = "/installed-agent/harness"
HARNESS_ENV_KEYS = ("LLM_API_KEY", "LLM_BASE_URL", "HARNESS_MODEL", "HARNESS_EFFORT")


def run_env() -> dict[str, str]:
    return {k: os.environ[k] for k in HARNESS_ENV_KEYS}


class HarnessAgent(BaseInstalledAgent):
    @staticmethod
    def name() -> str:
        return "harness"

    async def install(self, environment: BaseEnvironment) -> None:
        # ponytail: glibc binaries only (aarch64, x86_64). Alpine task images need a bun-linux-*-musl build.
        arch = (await self.exec_as_root(environment, command="uname -m")).stdout.strip()
        await environment.upload_file(DIST / f"harness-{arch}", BIN)
        await self.exec_as_root(environment, command=f"chmod a+rx {BIN}")
        # ponytail: Daytona allowlist blocks services.gradle.org; same zip on GitHub.
        props = "/app/gradle/wrapper/gradle-wrapper.properties"
        await self.exec_as_root(
            environment,
            command=(
                f'[ -f {props} ] && sed -i '
                '"s|services.gradle.org/distributions/gradle-8.7-bin.zip|'
                'github.com/gradle/gradle-distributions/releases/download/v8.7.0/gradle-8.7-bin.zip|g" '
                f"{props} || true"
            ),
        )

    @with_prompt_template
    async def run(self, instruction: str, environment: BaseEnvironment, context: AgentContext) -> None:
        env = run_env()
        if self.model_name:
            env["HARNESS_MODEL"] = self.model_name.split("/")[-1]
        await self.exec_as_agent(
            environment,
            command=f"{BIN} {shlex.quote(instruction)} 2>&1 </dev/null | tee {self.environment_logs_dir}/harness.txt",
            env=env,
        )
