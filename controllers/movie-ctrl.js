const Movie = require('../models/movie-model')
const auth = require('../auth.json')
const axios = require('axios')
const LocalStorage = require('ttl-localstorage')

/* const { getMatchData } = require('../../practice-front/src/api') */

const riotAPIHeader = {
    //Request header for Riot API
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://developer.riotgames.com",
    "X-Riot-Token": auth.key
}
createMovie = (req, res) => {
    const body = req.body

    if (!body) {
        return res.status(400).json({
            success: false,
            error: 'You must provide a movie',
        })
    }

    const movie = new Movie(body)

    if (!movie) {
        return res.status(400).json({ success: false, error: err })
    }

    movie
        .save()
        .then(() => {
            return res.status(201).json({
                success: true,
                id: movie._id,
                message: 'Movie created!',
            })
        })
        .catch(error => {
            return res.status(400).json({
                error,
                message: 'Movie not created!',
            })
        })
}

updateMovie = async (req, res) => {
    const body = req.body

    if (!body) {
        return res.status(400).json({
            success: false,
            error: 'You must provide a body to update',
        })
    }

    Movie.findOne({ _id: req.params.id }, (err, movie) => {
        if (err) {
            return res.status(404).json({
                err,
                message: 'Movie not found!',
            })
        }
        movie.name = body.name
        movie.time = body.time
        movie.rating = body.rating
        movie
            .save()
            .then(() => {
                return res.status(200).json({
                    success: true,
                    id: movie._id,
                    message: 'Movie updated!',
                })
            })
            .catch(error => {
                return res.status(404).json({
                    error,
                    message: 'Movie not updated!',
                })
            })
    })
}

deleteMovie = async (req, res) => {
    await Movie.findOneAndDelete({ _id: req.params.id }, (err, movie) => {
        if (err) {
            return res.status(400).json({ success: false, error: err })
        }

        if (!movie) {
            return res
                .status(404)
                .json({ success: false, error: `Movie not found` })
        }

        return res.status(200).json({ success: true, data: movie })
    }).catch(err => console.log(err))
}

getMovieById = async (req, res) => {
    await Movie.findOne({ _id: req.params.id }, (err, movie) => {
        if (err) {
            return res.status(400).json({ success: false, error: err })
        }

        if (!movie) {
            return res
                .status(404)
                .json({ success: false, error: `Movie not found` })
        }
        return res.status(200).json({ success: true, data: movie })
    }).catch(err => console.log(err))
}

getMovies = async (req, res) => {
    await Movie.find({}, (err, movies) => {
        if (err) {
            return res.status(400).json({ success: false, error: err })
        }
        if (!movies.length) {
            return res
                .status(404)
                .json({ success: false, error: `Movie not found` })
        }
        return res.status(200).json({ success: true, data: movies })
    }).catch(err => console.log(err))
}

getMatchListsByName = async (req, res) => {
    const encodedName = encodeURI(req.params.name);
    console.log('searching for summoner:  ', encodedName);
    let pid = '';
    await axios.get(`https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedName}`,
        {
            headers: riotAPIHeader
        }).catch((e) => {
            console.error(`!! Code ${e.response.status} --> ${e.response.statusText} !!`);
        }).then(async (response) => {
            if (!response) {
                return res
                    .status(404)
                    .json({ success: false, error: `no response` })
            } else {
                const { puuid } = response.data;
                await axios.get(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=100`,
                    {
                        headers: riotAPIHeader
                    }).then(async (response) => {
                        await response.data;
                        let matches = [];
                        for (let match of response.data) {
                            if (!matches.includes(match)) {
                                matches.push(match);
                            }
                        }
                        return res.status(200).json({ success: true, data: matches })
                    }).catch((e) => {
                        console.error(`!! Code ${e.response.status} --> ${e.response.statusText} !!`);
                    })
            }
        })
}

getMatchData = async (req, res) => {
    const { matchId } = req.params;
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    console.log(LocalStorage.LocalStorage);
    LocalStorage.get(`${matchId}`).then(async (data) => {
        if (data === null) {
            await axios.get(url,
                {
                    headers: riotAPIHeader
                }).catch((e) => {
                    console.error(`!! Code ${e.response.status} --> ${e.response.statusText} !!`);
                }).then(async (response) => {
                    if (!response) {
                        return res
                            .status(404)
                            .json({ success: false, error: `no response` })
                    } else {
                        /* console.log(response.data); */
                        LocalStorage.timeoutInSeconds = 900;
                        LocalStorage.put(`${matchId}`, response.data)
                            .then(() => {
                                return res.status(200).json({ success: true, data: response.data })

                            });

                        // return res.status(200).json({ success: true, data: response.data })
                    }
                }).catch((e) => {
                    console.error(`!! Code ${e.response.status} --> ${e.response.statusText} !!`);
                })
        }
    })
    // if (!ls.get(matchId)) {
    //     await axios.get(url,
    //         {
    //             headers: riotAPIHeader
    //         }).catch((e) => {
    //             console.error(`!! Code ${e.response.status} --> ${e.response.statusText} !!`);
    //         }).then(async (response) => {
    //             if (!response) {
    //                 return res
    //                     .status(404)
    //                     .json({ success: false, error: `no response` })
    //             } else {
    //                 /* console.log(response.data); */
    //                 ls.set(matchId, response.data, 1000000);

    //                 return res.status(200).json({ success: true, data: response.data })
    //             }
    //         }).catch((e) => {
    //             console.error(`!! Code ${e.response.status} --> ${e.response.statusText} !!`);
    //         })
    // } else {
    //     console.log(`Fetching ${matchId} from cache...`);
    //     return res.status(200).json({ success: true , data: ls.get(matchId)});

    // }
}

module.exports = {
    createMovie,
    updateMovie,
    deleteMovie,
    getMovies,
    getMovieById,
    getMatchListsByName,
    getMatchData
}