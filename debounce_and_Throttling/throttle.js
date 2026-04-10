// Throttling
// Throttling - it allows a functin to run at most once in a specific time interval.(api requesting)

function throttle(fn,limit){
    let lasttime = 0
    return function(...args){
        let now = Date.now()
        if( now-lasttime >= limit){
            fn.apply(this,args)
            lasttime = now
        }
    }
}


const scroll =(text)=>{
    console.log("scrolling....",text)
}

const throttled = throttle(scroll,10000)

setInterval(()=>{
    throttled("sending request")
},1000)