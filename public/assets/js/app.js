'use strict';


/* =========================================================
   MEDIA CENTER HST
   APP
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initWitaClock();
        initNewsSlider();

    }
);


/* =========================================================
   DATE & TIME - WITA
========================================================= */

function initWitaClock()
{
    const dateElement =
        document.getElementById('hst-date');

    const timeElement =
        document.getElementById('hst-time');


    if (!dateElement && !timeElement) {
        return;
    }


    const dateFormatter =
        new Intl.DateTimeFormat(
            'id-ID',
            {
                timeZone:
                    'Asia/Makassar',

                weekday:
                    'long',

                day:
                    '2-digit',

                month:
                    'long',

                year:
                    'numeric'
            }
        );


    const timeFormatter =
        new Intl.DateTimeFormat(
            'id-ID',
            {
                timeZone:
                    'Asia/Makassar',

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                second:
                    '2-digit',

                hour12:
                    false
            }
        );


    const render = () => {

        const now =
            new Date();


        if (dateElement) {
            dateElement.textContent =
                dateFormatter.format(now);
        }


        if (timeElement) {
            timeElement.textContent =
                `${timeFormatter.format(now)} WITA`;
        }

    };


    render();

    window.setInterval(
        render,
        1000
    );
}


/* =========================================================
   NEWS SLIDER
========================================================= */

function initNewsSlider()
{
    const track =
        document.getElementById(
            'news-track'
        );

    const prev =
        document.getElementById(
            'news-prev'
        );

    const next =
        document.getElementById(
            'news-next'
        );


    if (!track || !prev || !next) {
        return;
    }


    const cards =
        track.querySelectorAll(
            '.mc-news-card'
        );


    if (!cards.length) {

        prev.hidden = true;
        next.hidden = true;

        return;

    }


    const reduceMotion =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        );


    let autoTimer = null;
    let updateFrame = null;


    /* ---------------------------------------------------------
       Helper
    --------------------------------------------------------- */

    const getMaxScroll = () =>
        Math.max(
            0,
            track.scrollWidth
            - track.clientWidth
        );


    const hasOverflow = () =>
        track.scrollWidth
        > track.clientWidth + 2;


    const getStep = () => {

        const card =
            track.querySelector(
                '.mc-news-card'
            );


        if (!card) {
            return 0;
        }


        const style =
            window.getComputedStyle(
                track
            );


        const gap =
            parseFloat(
                style.columnGap
                || style.gap
            )
            || 0;


        return (
            card.getBoundingClientRect()
                .width
            + gap
        );

    };


    const shouldReduceMotion = () =>
        reduceMotion.matches
        || document.documentElement.dataset.a11yMotion === 'reduced';


    const getBehavior = () =>
        shouldReduceMotion()
            ? 'auto'
            : 'smooth';


    /* ---------------------------------------------------------
       Button state
    --------------------------------------------------------- */

    const updateControls = () => {

        const overflow =
            hasOverflow();


        prev.hidden =
            !overflow;

        next.hidden =
            !overflow;


        if (!overflow) {
            return;
        }


        const max =
            getMaxScroll();


        prev.disabled =
            track.scrollLeft <= 2;


        next.disabled =
            track.scrollLeft
            >= max - 2;

    };


    const requestControlsUpdate = () => {

        if (updateFrame) {
            return;
        }


        updateFrame =
            window.requestAnimationFrame(
                () => {

                    updateControls();

                    updateFrame = null;

                }
            );

    };


    /* ---------------------------------------------------------
       Navigation
    --------------------------------------------------------- */

    const scrollOne = direction => {

        track.scrollBy({
            left:
                getStep()
                * direction,

            behavior:
                getBehavior()
        });

    };


    const goNext = () => {

        const max =
            getMaxScroll();


        /*
         * Jika sudah sampai ujung,
         * kembali ke awal tanpa animasi panjang.
         */

        if (
            track.scrollLeft
            >= max - 3
        ) {

            track.scrollTo({
                left: 0,
                behavior: 'auto'
            });

            requestControlsUpdate();

            return;
        }


        scrollOne(1);

    };


    const goPrevious = () => {

        if (
            track.scrollLeft <= 2
        ) {
            return;
        }


        scrollOne(-1);

    };


    /* ---------------------------------------------------------
       Auto slider
    --------------------------------------------------------- */

    const stopAuto = () => {

        if (!autoTimer) {
            return;
        }


        window.clearInterval(
            autoTimer
        );


        autoTimer = null;

    };


    const startAuto = () => {

        stopAuto();


        if (
            shouldReduceMotion()
            || !hasOverflow()
            || document.hidden
        ) {
            return;
        }


        autoTimer =
            window.setInterval(
                goNext,
                5000
            );

    };


    const restartAuto = () => {

        stopAuto();
        startAuto();

    };


    /* ---------------------------------------------------------
       Events
    --------------------------------------------------------- */

    prev.addEventListener(
        'click',
        () => {

            goPrevious();
            restartAuto();

        }
    );


    next.addEventListener(
        'click',
        () => {

            goNext();
            restartAuto();

        }
    );


    track.addEventListener(
        'scroll',
        requestControlsUpdate,
        {
            passive: true
        }
    );


    /*
     * Pause saat user membaca / menggeser.
     */

    track.addEventListener(
        'mouseenter',
        stopAuto
    );


    track.addEventListener(
        'mouseleave',
        startAuto
    );


    track.addEventListener(
        'touchstart',
        stopAuto,
        {
            passive: true
        }
    );


    track.addEventListener(
        'touchend',
        startAuto,
        {
            passive: true
        }
    );


    track.addEventListener(
        'focusin',
        stopAuto
    );


    track.addEventListener(
        'focusout',
        startAuto
    );


    /*
     * Stop ketika tab browser tidak aktif.
     */

    document.addEventListener(
        'visibilitychange',
        () => {

            if (document.hidden) {
                stopAuto();
            } else {
                startAuto();
            }

        }
    );


    /*
     * Responsive.
     */

    window.addEventListener(
        'resize',
        () => {

            requestControlsUpdate();
            restartAuto();

        },
        {
            passive: true
        }
    );


    /*
     * Perubahan prefers-reduced-motion.
     */

    if (
        typeof reduceMotion
            .addEventListener
        === 'function'
    ) {

        reduceMotion.addEventListener(
            'change',
            restartAuto
        );

    }


    window.addEventListener(
        'mediacenter:a11y-change',
        restartAuto
    );


    /* ---------------------------------------------------------
       Initial state
    --------------------------------------------------------- */

    updateControls();
    startAuto();
}