import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import { elements, renderLoader, clearLoader } from './views/base';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';

/* Global state object of the app
 * - search object
 * - current recipe object
 * - shoping list object
 * - liked recipies
 * */
const state = {};

/*
Search controller
*/
const controlSearch = async () => {
    //1 get query from view
    const query = searchView.getInput();

    if (query) {
        //2 create new search object and added to state
        state.search = new Search(query); //in order to store craeated new Search object in state object

        // 3 Preparing UI for result (clear input and clear result)
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);
        try {
            // 4 Do the search . This would return promiss, so we need to await result
            await state.search.getResult();

            // 5 render result on UI this should hapened only if we have result, 
            //so we myst await for function getResult to geave result. 
            //SO controlSearch must be asinc function in order to prevent sinhron acting and we wouldnt have result, just pending
            clearLoader();
            searchView.renderResults(state.search.result);
        } catch(err) {
            alert('Something went wrong with search....!!!');
            clearLoader();
        }
    }
};

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if(btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    };
});

/*
Recipe controller
*/
const controlRecipe = async () => {
    //read id from url
    const id = window.location.hash.replace('#', '');
    
    if(id) {
        //prepare UI for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        //hightlight selected recipe
        if(state.search && id === state.search.id) searchView.highlightSelected(id);

        //create new object with selected recipe
        state.recipe = new Recipe(id); 

        try {
            //get recipe data and pase ingridients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            //call function tu calculate time and servings
            state.recipe.calcTime();
            state.recipe.calcServings();
            
            //render recipe
            clearLoader();
            recipeView.renderRecipe(
                state.recipe,
                state.likes.isLiked(id)
                );

        } catch (err) {
            alert('Error processing recipe!!!');
        }
    }
};

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

/*
List controller
*/
const controlList = () => {
    //create new list if there is none yet
    if(!state.list) state.list = new List();
    
    //add each ingredient to the list and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    })
};

//Handling delete and update list item events
elements.shopping.addEventListener('click', e => {
    //get id
    const id = e.target.closest('.shopping__item').dataset.itemid;

    //handle delete button
    if(e.target.matches('.shopping__delete, .shopping__delete *')) {
        //delete from state
        state.list.deleteItem(id);

        //dlete from UI
        listView.deleteItem(id);

    //handle count update
    } else if(e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value, 10);
        if(val > 0) {
            state.list.updateCount(id, val);
        } else {
            //e.target.value = 0;
            state.list.deleteItem(id);
            listView.deleteItem(id);
        }
    }
});

/*
Like controller
*/
const controlLike = () => {
    if(!state.likes) state.likes = new Likes();
    const currentId = state.recipe.id;
    
    //user has not jet liked current recipe
    if(!state.likes.isLiked(currentId)) {
        //add like to state
        const newLike = state.likes.addLike(
            currentId,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img
        );
        //toogle like button
        likesView.toggleLikeBtn(true);

        //add to UI list
        likesView.renderLike(newLike);
    
    //user has liked current recipe
    } else {
        //Remove like from state
        state.likes.deleteLike(currentId);

        //toogle like button
        likesView.toggleLikeBtn(false);

        //remove from UI list
        likesView.deleteLike(currentId);
    };

    //toogle likes menue if there is or no likes
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

//restore liked recipe on page load
window.addEventListener('load', () => {
    state.likes = new Likes();

    //restore likes
    state.likes.readStorage();

    //toggle like menu if there is or there is not likes
    likesView.toggleLikeMenu(state.likes.getNumLikes());

    //render existing likes
    state.likes.likes.forEach(like => likesView.renderLike(like)) //in the state. likes object we have likes arraj in storage (key)
});

//Handling recipe buttom click
elements.recipe.addEventListener('click', e => {
    if(e.target.matches('.btn-decrease, .btn-decrease *')) {
        //Decrease button is clicked
        if(state.recipe.servings > 1) { //cant decrase if it is 1 servings, because it woul be 0 and itll geave NaN (1/0)
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if(e.target.matches('.btn-increase, .btn-increase *')) {
        //Increase button is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if(e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        //add ingedients to shopping list
        controlList();
    } else if(e.target.matches('.recipe__love, .recipe__love *')) {
        //like controler
        controlLike();
    }
});
