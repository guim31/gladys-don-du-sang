# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

The integration needs no account, no key and no secret. It reads public data only
(`oudonner.api.efs.sante.fr`, HTTPS, outbound) and receives no inbound connection. It reads the
coordinates of the house from Gladys (`location: true`), or uses the point entered in the
configuration; the request to the EFS carries that centre **rounded to 0.01°** (about a
kilometre), never the exact position, and the coordinates are never logged. It stores in `/data`
only `state.json`: the ids and days of the drives already announced, a fingerprint (hash) of the
zone they belong to, and the dates of the last "today" / "tomorrow" passes, nothing personal.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and the third-party services and devices the integration talks to.
