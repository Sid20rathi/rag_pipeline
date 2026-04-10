// Debounce 

// Debounce - Function runs after a specific time interval after the last call.eg(search bar in the google )




function debounce(fun,delay){
    let timer;
    return function(...args){
        clearTimeout(timer)
        timer = setTimeout(()=>{
            fun.apply(this,args)
        },delay)


    }
}

const search =(text)=>{
    console.log("searching....",text)
}

const debounced = debounce(search,3000)

debounced("hello")
debounced("world")
debounced("js") 
