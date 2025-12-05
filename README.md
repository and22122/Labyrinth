# Labyrinth

This is a game that involves navigating a procedurally generated labyrinth. As you navigate the maze, you'll "remember" and gradually "forget" different cells based on whether or not you're close enough to reveal them.
You play as Theseus (who starts in the upper-left corner of the screen), and your goal is to navigate to Ariadne (who starts in the lower-right corner) while avoiding the minotaur (who starts roughly in the middle of the maze).
Each entity (Theseus, the minotaur, and Ariadne) moves only when you, the player, move. This happens when you release a valid key, indicating the direction you want to move. This game works with both the WASD and arrow keys.
Notice anything odd about the maze after a while? That's right! Whenever a cell goes from being fully hidden ("forgotten" or unvisited), the maze regenerates its layout! You can use this to your advantage, but it comes with risks!
When the minotaur has an unobscured view of you (its view extends in each orthogonal direction until the closest wall in each direction), it can charge a certain number of spaces, allowing it to catch up to you faster. It can also sometimes hear when you regenerate cells that are close to it, which allows it to move faster.
Ariadne also moves! Due to the story of Ariadne's string, she has a special mechanic that affects her movement: she has a memory of cells she visits that doesn't fade. While she prefers to visit cells she hasn't been to before, whenever she moves across spaces she hasn't been to before she can follow her string, allowing her to move faster. Note that there is no visible string- you can't follow her string to find her.

Don't forget- make your way to Ariadne before the minotaur catches you, and you win! Otherwise you'll lose.

## Instructions for Build and Use

Steps to build and/or run the software:

1. Install Visual Studio Code
2. Make sure that you have p5.js and JavaScript downloaded on your computer
3. Make sure you have the Live Server (by Ritwick Dey) and p5.vscode (by Sam Lavigne) extensions installed in Visual Studio Code.
4. Download and setup the repository in Visual Studio Code.
5. In IDE, go to the bar at the bottom of the IDE, and click it says "Go Live" (in the lower-right corner).
6. This should run the program in a new tab in you web browser.

Instructions for using the software:

1. Make sure that you have the repository downloaded and that you can use Live Server.
2. Use Live Server to run the program in your web browser.
3. Enjoy!

## Development Environment 

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* Install Visual Studio Code
* Make sure that you have p5.js and JavaScript downloaded on your computer
* Make sure you have the Live Server (by Ritwick Dey) and p5.vscode (by Sam Lavigne) extensions installed in Visual Studio Code.
* Download and setup the repository in Visual Studio Code.
* 

## Useful Websites to Learn More

I found these websites useful in developing this software:

* [The (former) Smallest Redstone Maze Generator in Minecraft](https://www.youtube.com/watch?si=lVHGkYZfW_mimRJI&v=GTz6BEGs6zE&feature=youtu.be)
* [p5.js reference](https://p5js.org/)

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* [ ] Improving AIs for minotaur and Ariadne movement
* [ ] Expanding the maze and adding assets for walls
* [ ] Improving resizability