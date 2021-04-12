### 🙋‍♂️ Made by [@thekitze](https://twitter.com/thekitze)  

### Other projects:
- 🏫 [React Academy](https://reactacademy.io) - Interactive React and GraphQL workshops
- 💌 [Twizzy](https://twizzy.app) - A standalone app for Twitter DM
- 💻 [Sizzy](https://sizzy.co) - A tool for testing responsive design on multiple devices at once
- 🤖 [JSUI](https://github.com/kitze/JSUI) - A powerful UI toolkit for managing JavaScript apps

---

# react-long
Warning: works only on devices that support touch.

# Demo

[http://react-long.surge.sh](http://react-long.surge.sh)

# Example

```js
<div>
  <LongPress
    time={1000}
    onLongPress={() => alert('pressed for 1s')}
    onPress={() => alert('pressed')}
  >
    <div>
      Hello world
    </div>
  </LongPress>
</div>
```
