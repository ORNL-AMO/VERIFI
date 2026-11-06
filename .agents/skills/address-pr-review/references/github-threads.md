# GitHub thread operations

Read this when the available connector does not expose complete discussions or thread resolution. Discover tool capabilities at runtime; a combined comment timeline can omit thread IDs and resolution state.

## Complete reads and identity

For the selected repository/host and PR, collect all pages of:

- Review submissions: `GET /repos/{owner}/{repo}/pulls/{number}/reviews`.
- Inline review comments: `GET /repos/{owner}/{repo}/pulls/{number}/comments`.
- Relevant PR conversation comments: `GET /repos/{owner}/{repo}/issues/{number}/comments`.
- GraphQL review threads and their comments. Check pagination on each connection, including replies within a single thread.

Match the requested review using its returned URL/ID and comment membership, retaining later replies that clarify it. A REST numeric comment/review ID, a GraphQL comment node ID, and a GraphQL **thread** node ID are different identifiers. Obtain thread IDs from GitHub; never construct or infer them from URL fragments.

The following read-only query pages threads; replace the uppercase repository values and PR number. For another GitHub host, use the CLI's `--hostname` option. The query deliberately has only one paginated connection.

```sh
gh api graphql --paginate --slurp \
  -F owner=OWNER -F name=REPOSITORY -F number=123 \
  -f query='query($owner: String!, $name: String!, $number: Int!, $endCursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        headRefOid
        reviewThreads(first: 100, after: $endCursor) {
          nodes { id path isResolved isOutdated viewerCanReply viewerCanResolve }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }'
```

Read every in-scope thread's `comments` through a separate paginated query on `node(id: $threadId) { ... on PullRequestReviewThread { comments(...) { nodes { id url body author { login } pullRequestReview { id url } } pageInfo { hasNextPage endCursor } } } }`. Supply typed variables and normal pagination arguments as above; do not assume the first 100 replies are complete. Preserve the existing head snapshot and refresh it before writing.

GitHub defines the thread's resolution and viewer-capability fields in its [pull-request GraphQL schema](https://docs.github.com/en/graphql/reference/pulls#pullrequestreviewthread). The [GitHub CLI API manual](https://cli.github.com/manual/gh_api) documents GraphQL pagination, typed variables, host selection, and file-based payloads.

## Authorized replies and resolution

Use a supported thread-reply tool, or the REST reply endpoint `POST /repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies` with the thread's root REST comment ID. With GraphQL, use the returned thread node ID and the documented reply mutation. Verify repository/PR ownership before either operation.

To resolve a verified, eligible thread, pass its returned node ID as `threadId` to [`resolveReviewThread`](https://docs.github.com/en/graphql/reference/pulls#resolvereviewthread). A request body can use this shape:

```json
{
  "query": "mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id isResolved } } }",
  "variables": { "threadId": "THREAD_NODE_ID_RETURNED_BY_GITHUB" }
}
```

Send an authorized request with `gh api graphql --input request.json`, using the selected host where needed. Construct JSON with a serializer and put multiline reply text in structured arguments or a payload file; never interpolate reviewer text into shell commands. These are templates, not operations to run while installing the skill or assessing feedback read-only.

Require a successful result and re-read the thread to confirm `isResolved`. Check API error payloads as well as process/HTTP success. If a request times out, refresh replies and resolution state before retrying; do not assume `clientMutationId` deduplicates requests. Do not resolve through an unrelated top-level comment, dismiss a submitted review to clear its state, or switch accounts to bypass missing permissions.
