"""Train compact scene-choice and editorial-preference models locally.

Annotations describe the user's reference editing patterns. They are curated
paraphrases and controlled layout comparisons, not audience-retention data or
fine-tuning of the installed language model. Held-out sentence families never
enter training. Runtime uses the exported weights directly, without Python.
"""
import hashlib
import json
import re
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
LABELS = ["battle", "move-explainer", "setup", "pair", "person", "rank", "weather", "team", "neutral"]
TRAIN = {
 "battle": ["pokemon uses move on pokemon", "pokemon threatens pokemon with move", "pokemon can one shot pokemon", "pokemon attacks pokemon and the target recoils", "pokemon checks pokemon with move", "pokemon knocks out pokemon", "pokemon fires a beam at pokemon", "pokemon counters pokemon with this attack", "pokemon hits both opponents", "pokemon is not affected by the incoming move", "pokemon strikes pokemon with a physical move", "pokemon shoots move towards pokemon"],
 "move-explainer": ["move is one of the best moves", "here is how move works", "this move reverses the turn order", "move is useful for several pokemon", "which pokemon learn this move", "the move has great distribution", "this ability changes the battle rules", "let me explain what this move does", "move has this base power and accuracy", "a general guide to move", "this move is important for team building", "many pokemon can learn this attack"],
 "setup": ["pokemon uses move to raise its attack", "pokemon gets a stat boost", "pokemon boosts its special attack", "pokemon charges up before attacking", "pokemon sets up with move", "pokemon raises its stats", "pokemon is getting stronger", "pokemon prepares a powerful attack", "pokemon increases its speed", "pokemon uses move and doubles its speed", "pokemon has time to set up", "pokemon activates an offensive boost"],
 "pair": ["pokemon and pokemon are good together", "these pokemon have great synergy", "pokemon supports its partner pokemon", "pokemon protects pokemon with redirection", "pokemon pairs well with pokemon", "these two pokemon complement each other", "pokemon covers its partner weakness", "pokemon enables pokemon to attack safely", "pokemon works alongside pokemon", "pokemon helps its teammate", "these partners form a strong combination", "pokemon keeps pokemon safe"],
 "person": ["person won the tournament", "person finished undefeated", "person entered the regional", "person is the player behind this strategy", "person made this team", "person is the champion", "person said this in an interview", "person revealed the winning team", "person finished with no losses", "person defeated the other players", "person uploaded this explanation", "person lifted the trophy"],
 "rank": ["pokemon is number one", "pokemon takes first place", "pokemon became the best ranked choice", "pokemon dethroned pokemon", "pokemon rose to the top", "pokemon is the tournament top pick", "pokemon ranks above pokemon", "pokemon is the highest ranked threat", "pokemon claims the crown", "pokemon is the strongest in this ranking", "pokemon was crowned the winner", "pokemon drops to second place"],
 "weather": ["rain falls across the battlefield", "pokemon sets up rain", "snow covers the arena", "pokemon battles in the rain", "the weather turns sunny", "a storm begins during the battle", "pokemon changes the weather to snow", "sunlight powers up the team", "wind rushes across the allied side", "pokemon brings rain to the field", "fog covers the battle area", "the battlefield is frozen with snow"],
 "team": ["here is the complete team", "these six pokemon form the roster", "pause here to copy the build", "show the full team and its items", "this is the exact team he used", "all six pokemon share these roles", "the team has three support pokemon", "the roster contains six pokemon", "these pokemon make up the tournament team", "copy these moves items and stat points", "all of the team members are shown together", "the whole roster is ready for battle"],
 "neutral": ["this is an interesting story", "there is more to this than it seems", "the next part explains the idea", "at first it looks ordinary", "this is not about a battle", "one pokemon leaves and a new one comes", "the captions already explain the ordinary number", "do not add unrelated pictures", "hold the useful explanation", "we need to look at the context", "there is nothing new to reveal yet", "this is the opening promise"]}
TEST = {
 "battle": ["pokemon launches move into pokemon", "pokemon destroys pokemon with a single hit", "pokemon is threatening its opponent with move", "pokemon takes the incoming attack and flinches"],
 "move-explainer": ["let us look at the mechanics of move", "which competitive pokemon get access to move", "move is an excellent option in general", "a breakdown of this move for any team"],
 "setup": ["pokemon powers up its special attack", "pokemon uses move to increase its stats", "pokemon gains a speed boost", "pokemon can use the opening to set up"],
 "pair": ["pokemon is a perfect partner for pokemon", "these two have fantastic synergy", "pokemon supports pokemon by drawing attacks away", "pokemon and pokemon work well as a pair"],
 "person": ["person took the title without losing", "person is the winning competitor", "person talked about their team", "person won every recorded match"],
 "rank": ["pokemon is the top ranked option", "pokemon takes the number one spot", "pokemon knocked the old king off the throne", "pokemon finishes in first place"],
 "weather": ["rain starts falling around pokemon", "pokemon starts a snowstorm", "sun shines over this battlefield", "the arena fills with mist"],
 "team": ["the entire roster appears here", "pause to inspect all six builds", "show every member of the full team", "here are the team members with their sets"],
 "neutral": ["the story continues from here", "keep that explanation on the screen", "the ordinary count needs no graphic", "context matters for this sentence"]}
FINAL_TEST = {
 "battle": ["pokemon connects with an attack against pokemon", "pokemon fires move at both targets", "pokemon knocks its rival down"],
 "move-explainer": ["here is a general explanation of move mechanics", "these pokemon have access to move", "what exactly does move do"],
 "setup": ["pokemon boosts its defenses before fighting", "pokemon increases its attack with move", "pokemon uses the turn to charge up"],
 "pair": ["pokemon provides support for its teammate", "pokemon is great alongside pokemon", "partners cover each other weaknesses"],
 "person": ["person is the player who created this build", "person won the championship with this team", "person finished the event undefeated"],
 "rank": ["pokemon climbed into first place", "pokemon has the highest rank of them all", "pokemon is the king of this ranking"],
 "weather": ["snow is falling across the arena", "rain changes this battlefield", "sunlight shines on the field"],
 "team": ["the six members of this team appear", "hold the full builds so everyone can pause to copy", "the entire team with held items"],
 "neutral": ["there is another part to this story", "the explanation deserves a longer hold", "ordinary counts are just words in the captions"]}

def tokens(text):
    words = re.findall(r"[a-z0-9]+", text.lower())
    fragments = ["char:" + word[i:i+4] for word in words if len(word)>4 for i in range(len(word)-3)]
    return words + [a + " " + b for a, b in zip(words, words[1:])] + fragments

def train():
    rows = [{"text": text, "label": label, "split": split, "provenance": "Curated general paraphrase of user reference editing patterns"} for split, data in [("train", TRAIN), ("development", TEST), ("held-out", FINAL_TEST)] for label, examples in data.items() for text in examples]
    training = [r for r in rows if r["split"] == "train"]
    heldout = [r for r in rows if r["split"] == "held-out"]
    vocabulary = sorted({t for r in training for t in tokens(r["text"])})
    indices = {word: i for i, word in enumerate(vocabulary)}
    df = np.array([sum(word in tokens(r["text"]) for r in training) for word in vocabulary])
    idf = np.log((1 + len(training)) / (1 + df)) + 1
    def vector(text):
        x = np.zeros(len(vocabulary))
        for word in tokens(text):
            if word in indices:
                x[indices[word]] += 1
        x *= idf
        return x / max(np.linalg.norm(x), 1e-8)
    x = np.array([vector(r["text"]) for r in training])
    y = np.eye(len(LABELS))[[LABELS.index(r["label"]) for r in training]]
    w, b = np.zeros((x.shape[1], len(LABELS))), np.zeros(len(LABELS))
    for _ in range(3000):
        logits = x @ w + b
        probability = np.exp(logits - logits.max(axis=1, keepdims=True))
        probability /= probability.sum(axis=1, keepdims=True)
        delta = (probability - y) / len(x)
        w -= .8 * (x.T @ delta + .0008 * w)
        b -= .8 * delta.sum(axis=0)
    predictions = [LABELS[int(np.argmax(vector(r["text"]) @ w + b))] for r in heldout]
    hits = sum(a == r["label"] for a, r in zip(predictions, heldout))

    features = ["subjectArea", "evidenceReadability", "supportPictures", "meaningfulChanges", "cueAlignment", "unrelatedPictures", "occlusion", "continuity", "emptyHook", "usefulHold", "appropriateDiagram", "gameplayEvidence", "purposefulMotion"]
    # Reference observations establish preferred compositions; controlled
    # omissions are negative examples. Split layout families before fitting.
    rng = np.random.default_rng(1947)
    comparisons = []
    good = np.array([.9,.85,.65,.85,1,0,0,.9,0,.8,1,.6,.8])
    for family in range(20):
        preferred = np.clip(good + rng.normal(0,.04,len(good)),0,1)
        for defect in ["tiny-subject","unreadable-evidence","empty-hook","irrelevant-decoration","clutter","static-slideshow"]:
            bad = preferred.copy()
            if defect == "tiny-subject": bad[0] = .08
            elif defect == "unreadable-evidence": bad[1] = .05
            elif defect == "empty-hook": bad[8] = 1; bad[2] = 0
            elif defect == "irrelevant-decoration": bad[5] = .9; bad[4] = .25
            elif defect == "clutter": bad[6] = .9; bad[1] = .3
            else: bad[3] = .04; bad[12] = .08
            comparisons.append({"family":family,"preferred":preferred.tolist(),"rejected":bad.tolist(),"defect":defect,"split":"train" if family<15 else "held-out"})
    differences = np.array([np.array(r["preferred"])-r["rejected"] for r in comparisons if r["split"]=="train"])
    rank = np.zeros(len(features))
    for _ in range(2500):
        probability = 1 / (1 + np.exp(np.clip(differences @ rank,-30,30)))
        rank += .1 * (differences.T @ probability / len(differences) - .002 * rank)
    ranked = [r for r in comparisons if r["split"]=="held-out"]
    rank_hits = int(sum(np.dot(np.array(r["preferred"])-r["rejected"],rank)>0 for r in ranked))
    evaluation = {"trainingSentences":len(training),"heldOutSentences":len(heldout),"correctSceneChoices":hits,"sceneChoiceAccuracy":hits/len(heldout),"trainingPreferences":len(differences),"heldOutPreferences":len(ranked),"correctPreferences":rank_hits,"preferenceAccuracy":rank_hits/len(ranked),"limits":"Small curated editing benchmark. No measured audience retention, broad creative-quality guarantee or language-model fine-tuning.","errors":[{"text":r["text"],"expected":r["label"],"predicted":a} for a,r in zip(predictions,heldout) if a!=r["label"]]}
    model = {"version":1,"name":"Local reference scene selector","labels":LABELS,"vocabulary":vocabulary,"idf":idf.round(8).tolist(),"weights":w.round(8).tolist(),"bias":b.round(8).tolist(),"rankFeatures":features,"rankWeights":rank.round(8).tolist(),"evaluation":evaluation,"provenance":{"references":["xOPvJql78OA","Nstw1MbZN44","L8vnRyKN2oI","H7Ui71vRA5k","This-Move-Changes"],"annotations":"Manually inspected reference patterns and user-requested general editing behavior","rawVideosUsedForWeightTraining":False,"languageModelWeightsChanged":False}}
    digest = hashlib.sha256(json.dumps(model,sort_keys=True).encode()).hexdigest()
    model["digest"] = digest
    folder = ROOT / "electron" / "data"
    report = ROOT / "workspace" / "audit-training"
    report.mkdir(parents=True,exist_ok=True)
    (report / "training-report.json").write_text(json.dumps({"digest":digest,**evaluation},indent=2),encoding="utf-8")
    print(json.dumps(evaluation))
    if evaluation["sceneChoiceAccuracy"] < .85 or evaluation["preferenceAccuracy"] < .95:
        raise SystemExit("Evaluation did not meet the activation threshold")
    temporary = folder / "reference-style-model.saving"
    temporary.write_text(json.dumps(model,separators=(",",":")),encoding="utf-8")
    temporary.replace(folder / "reference-style-model.json")
    (folder / "reference-style-training.json").write_text(json.dumps({"sentences":rows,"preferences":comparisons},indent=2),encoding="utf-8")

if __name__ == "__main__":
    train()
